"""
Upload API: загрузка файлов и изображений в S3, аватаров пользователей
"""
import json
import os
import base64
import uuid
import mimetypes
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p250553_messenger_platform_d")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id",
}

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_FILES = ALLOWED_IMAGE | {"application/pdf", "text/plain", "application/zip",
                                  "audio/webm", "audio/ogg", "audio/wav", "audio/mp4",
                                  "video/mp4", "video/webm"}
MAX_SIZE = 20 * 1024 * 1024  # 20 MB


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.username, u.display_name FROM {SCHEMA}.users u "
        f"JOIN {SCHEMA}.sessions s ON s.user_id=u.id "
        f"WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def resp(status, data):
    h = {**CORS, "Content-Type": "application/json"}
    return {"statusCode": status, "headers": h, "body": json.dumps(data, default=str)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "POST")
    hdrs = event.get("headers") or {}
    token = hdrs.get("X-Auth-Token") or hdrs.get("x-auth-token", "")
    params = event.get("queryStringParameters") or {}
    raw_path = params.get("_path") or event.get("path", "/") or "/"
    path = raw_path.rstrip("/") or "/"

    conn = get_conn()
    user = get_user(token, conn)
    if not user:
        conn.close()
        return resp(401, {"error": "Не авторизован"})
    uid = user[0]

    body = {}
    if event.get("body"):
        try:
            raw = event["body"]
            if event.get("isBase64Encoded"):
                raw = base64.b64decode(raw).decode()
            body = json.loads(raw)
        except Exception:
            pass

    # POST /upload/file — загрузить файл в чат
    if path in ("/upload/file", "/upload") and method == "POST":
        file_data = body.get("data", "")   # base64 строка
        file_name = body.get("file_name", "file")
        content_type = body.get("content_type", "application/octet-stream")
        chat_id = body.get("chat_id")

        if not file_data:
            conn.close()
            return resp(400, {"error": "Нет данных файла"})

        if content_type not in ALLOWED_FILES:
            conn.close()
            return resp(400, {"error": "Тип файла не поддерживается"})

        try:
            file_bytes = base64.b64decode(file_data)
        except Exception:
            conn.close()
            return resp(400, {"error": "Неверный base64"})

        if len(file_bytes) > MAX_SIZE:
            conn.close()
            return resp(400, {"error": "Файл слишком большой (максимум 20 МБ)"})

        ext = mimetypes.guess_extension(content_type) or ""
        if ext in (".jpe", ".jpeg"):
            ext = ".jpg"
        key = f"messenger/{uid}/{uuid.uuid4().hex}{ext}"

        s3 = get_s3()
        s3.put_object(
            Bucket="files",
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        url = cdn_url(key)
        is_image = content_type in ALLOWED_IMAGE
        is_voice = content_type.startswith("audio/")
        msg_type = "image" if is_image else ("voice" if is_voice else "file")
        file_size = len(file_bytes)

        # Если указан chat_id — сразу создаём сообщение
        if chat_id:
            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
            if cur.fetchone():
                voice_dur = body.get("voice_duration")
                cur.execute(
                    f"INSERT INTO {SCHEMA}.messages (chat_id, user_id, text, msg_type, file_url, file_name, file_size, file_type, voice_duration) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
                    (chat_id, uid, body.get("text", ""), msg_type, url, file_name, file_size, content_type, voice_dur)
                )
                mid, cat = cur.fetchone()
                cur.execute(f"UPDATE {SCHEMA}.chat_members SET last_read_at=NOW() WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
                conn.commit()
                conn.close()
                return resp(200, {
                    "url": url, "key": key, "type": msg_type,
                    "message": {"id": mid, "text": body.get("text", ""), "msg_type": msg_type,
                                "file_url": url, "file_name": file_name, "file_size": file_size,
                                "created_at": cat.isoformat(), "user_id": uid, "mine": True}
                })

        conn.close()
        return resp(200, {"url": url, "key": key, "type": msg_type, "file_name": file_name, "file_size": file_size})

    # POST /upload/avatar — аватар пользователя
    if path == "/upload/avatar" and method == "POST":
        file_data = body.get("data", "")
        content_type = body.get("content_type", "image/jpeg")

        if content_type not in ALLOWED_IMAGE:
            conn.close()
            return resp(400, {"error": "Только изображения"})

        try:
            file_bytes = base64.b64decode(file_data)
        except Exception:
            conn.close()
            return resp(400, {"error": "Неверный base64"})

        if len(file_bytes) > 5 * 1024 * 1024:
            conn.close()
            return resp(400, {"error": "Файл слишком большой (максимум 5 МБ)"})

        ext = ".jpg" if "jpeg" in content_type else ".png"
        key = f"avatars/{uid}/{uuid.uuid4().hex}{ext}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=key, Body=file_bytes, ContentType=content_type)
        url = cdn_url(key)

        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url=%s WHERE id=%s", (url, uid))
        conn.commit()
        conn.close()
        return resp(200, {"url": url})

    conn.close()
    return resp(404, {"error": "Not found"})
