"""
Главный API мессенджера: auth, chats, messages, contacts, channels, notifications, search
"""
import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p250553_messenger_platform_d")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def resp(status, data, extra_headers=None):
    h = {**CORS, "Content-Type": "application/json"}
    if extra_headers:
        h.update(extra_headers)
    return {"statusCode": status, "headers": h, "body": json.dumps(data, default=str)}


def hash_pw(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()


def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.username, u.display_name, u.avatar_url, u.status "
        f"FROM {SCHEMA}.users u JOIN {SCHEMA}.sessions s ON s.user_id=u.id "
        f"WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    hdrs = event.get("headers") or {}
    token = hdrs.get("X-Auth-Token") or hdrs.get("x-auth-token", "")
    params = event.get("queryStringParameters") or {}
    # Роутинг: путь из querystring ?_path=... или из event.path
    raw_path = params.get("_path") or event.get("path", "/") or "/"
    path = raw_path.rstrip("/") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    # ── AUTH ──────────────────────────────────────────────

    if path == "/register" and method == "POST":
        username = (body.get("username") or "").strip()
        display_name = (body.get("display_name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        if not all([username, display_name, email, password]):
            return resp(400, {"error": "Заполните все поля"})
        if len(password) < 6:
            return resp(400, {"error": "Пароль минимум 6 символов"})
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s OR email=%s", (username, email))
        if cur.fetchone():
            conn.close()
            return resp(409, {"error": "Пользователь уже существует"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (username, display_name, email, password_hash, status) VALUES (%s,%s,%s,%s,'online') RETURNING id",
            (username, display_name, email, hash_pw(password))
        )
        uid = cur.fetchone()[0]
        token_new = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s,%s)", (uid, token_new))
        conn.commit()
        conn.close()
        return resp(200, {"token": token_new, "user": {"id": uid, "username": username, "display_name": display_name, "email": email, "status": "online", "bio": "", "avatar_url": None}})

    if path == "/login" and method == "POST":
        login = (body.get("login") or "").strip().lower()
        password = body.get("password") or ""
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, display_name, email, avatar_url, bio, status FROM {SCHEMA}.users WHERE (email=%s OR username=%s) AND password_hash=%s",
            (login, login, hash_pw(password))
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return resp(401, {"error": "Неверный логин или пароль"})
        uid, uname, dname, email, av, bio, st = row
        token_new = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s,%s)", (uid, token_new))
        cur.execute(f"UPDATE {SCHEMA}.users SET status='online', last_seen=NOW() WHERE id=%s", (uid,))
        conn.commit()
        conn.close()
        return resp(200, {"token": token_new, "user": {"id": uid, "username": uname, "display_name": dname, "email": email, "avatar_url": av, "bio": bio, "status": "online"}})

    if path == "/me" and method == "GET":
        conn = get_conn()
        user = get_user(token, conn)
        conn.close()
        if not user:
            return resp(401, {"error": "Не авторизован"})
        uid, uname, dname, av, st = user
        return resp(200, {"id": uid, "username": uname, "display_name": dname, "avatar_url": av, "status": st})

    if path == "/logout" and method == "POST":
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s", (token,))
            row = cur.fetchone()
            if row:
                cur.execute(f"UPDATE {SCHEMA}.users SET status='offline', last_seen=NOW() WHERE id=%s", (row[0],))
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
            conn.commit()
            conn.close()
        return resp(200, {"ok": True})

    if path == "/profile" and method == "PUT":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        fields, vals = [], []
        for f in ["display_name", "bio", "status", "avatar_url"]:
            if f in body:
                fields.append(f"{f}=%s")
                vals.append(body[f])
        if fields:
            vals.append(uid)
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(fields)} WHERE id=%s", vals)
            conn.commit()
        cur = conn.cursor()
        cur.execute(f"SELECT id, username, display_name, email, avatar_url, bio, status FROM {SCHEMA}.users WHERE id=%s", (uid,))
        u = cur.fetchone()
        conn.close()
        return resp(200, {"id": u[0], "username": u[1], "display_name": u[2], "email": u[3], "avatar_url": u[4], "bio": u[5], "status": u[6]})

    # ── CHATS ─────────────────────────────────────────────

    if path == "/chats" and method == "GET":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.type, c.name, c.avatar_url,
                   (SELECT text FROM {SCHEMA}.messages WHERE chat_id=c.id AND is_deleted=FALSE ORDER BY created_at DESC LIMIT 1),
                   (SELECT created_at FROM {SCHEMA}.messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1),
                   (SELECT COUNT(*) FROM {SCHEMA}.messages m WHERE m.chat_id=c.id AND m.user_id != %s
                    AND m.created_at > COALESCE((SELECT last_read_at FROM {SCHEMA}.chat_members WHERE chat_id=c.id AND user_id=%s), '2000-01-01'::timestamptz))
            FROM {SCHEMA}.chats c
            JOIN {SCHEMA}.chat_members cm ON cm.chat_id=c.id
            WHERE cm.user_id=%s
            ORDER BY (SELECT created_at FROM {SCHEMA}.messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1) DESC NULLS LAST
        """, (uid, uid, uid))
        chats = []
        for r in cur.fetchall():
            cid, ctype, cname, cav, ltxt, ltime, unread = r
            online = False
            if ctype == "personal":
                cur2 = conn.cursor()
                cur2.execute(f"""
                    SELECT u.display_name, u.avatar_url, u.status FROM {SCHEMA}.users u
                    JOIN {SCHEMA}.chat_members cm ON cm.user_id=u.id
                    WHERE cm.chat_id=%s AND u.id!=%s LIMIT 1
                """, (cid, uid))
                other = cur2.fetchone()
                if other:
                    cname, cav, st = other
                    online = st == "online"
            chats.append({"id": cid, "type": ctype, "name": cname, "avatar_url": cav, "last_text": ltxt or "", "last_time": ltime.isoformat() if ltime else None, "unread": int(unread or 0), "online": online})
        conn.close()
        return resp(200, {"chats": chats})

    if path == "/chats" and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        ctype = body.get("type", "personal")
        cname = body.get("name", "")
        member_ids = body.get("member_ids", [])
        cur = conn.cursor()
        cur.execute(f"INSERT INTO {SCHEMA}.chats (type, name, created_by) VALUES (%s,%s,%s) RETURNING id", (ctype, cname, uid))
        cid = cur.fetchone()[0]
        for mid in set([uid] + member_ids):
            role = "admin" if mid == uid else "member"
            cur.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id, role) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (cid, mid, role))
        conn.commit()
        conn.close()
        return resp(200, {"id": cid, "type": ctype, "name": cname})

    if "/messages" in path and not path.startswith("/messages"):
        parts = path.split("/")
        try:
            chat_id = int(parts[2])
        except Exception:
            return resp(400, {"error": "Bad chat_id"})

        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid, uname, dname, av, st = user

        if method == "GET":
            limit = int(params.get("limit", 50))
            offset = int(params.get("offset", 0))
            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
            if not cur.fetchone():
                conn.close()
                return resp(403, {"error": "Нет доступа"})
            cur.execute(f"""
                SELECT m.id, m.user_id, u.display_name, u.avatar_url, m.text, m.msg_type, m.reply_to, m.is_edited, m.created_at
                FROM {SCHEMA}.messages m LEFT JOIN {SCHEMA}.users u ON u.id=m.user_id
                WHERE m.chat_id=%s AND m.is_deleted=FALSE
                ORDER BY m.created_at ASC LIMIT %s OFFSET %s
            """, (chat_id, limit, offset))
            msgs = [{"id": r[0], "user_id": r[1], "display_name": r[2], "avatar_url": r[3], "text": r[4], "type": r[5], "reply_to": r[6], "is_edited": r[7], "created_at": r[8].isoformat(), "mine": r[1] == uid} for r in cur.fetchall()]
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET last_read_at=NOW() WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
            conn.commit()
            conn.close()
            return resp(200, {"messages": msgs})

        if method == "POST":
            text = (body.get("text") or "").strip()
            if not text:
                conn.close()
                return resp(400, {"error": "Пустое сообщение"})
            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
            if not cur.fetchone():
                conn.close()
                return resp(403, {"error": "Нет доступа"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.messages (chat_id, user_id, text, msg_type, reply_to) VALUES (%s,%s,%s,%s,%s) RETURNING id, created_at",
                (chat_id, uid, text, body.get("type", "text"), body.get("reply_to"))
            )
            mid, cat = cur.fetchone()
            cur.execute(f"UPDATE {SCHEMA}.chat_members SET last_read_at=NOW() WHERE chat_id=%s AND user_id=%s", (chat_id, uid))
            conn.commit()
            conn.close()
            return resp(200, {"id": mid, "text": text, "user_id": uid, "display_name": dname, "avatar_url": av, "created_at": cat.isoformat(), "mine": True, "is_edited": False})

    if path.startswith("/messages/") and method in ("PUT", "DELETE"):
        parts = path.split("/")
        msg_id = int(parts[2])
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        if method == "PUT":
            cur.execute(f"UPDATE {SCHEMA}.messages SET text=%s, is_edited=TRUE, updated_at=NOW() WHERE id=%s AND user_id=%s", (body.get("text", ""), msg_id, uid))
        else:
            cur.execute(f"UPDATE {SCHEMA}.messages SET is_deleted=TRUE WHERE id=%s AND user_id=%s", (msg_id, uid))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    # ── CONTACTS ──────────────────────────────────────────

    if path == "/contacts" and method == "GET":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        cur.execute(f"""
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, c.status
            FROM {SCHEMA}.contacts c JOIN {SCHEMA}.users u ON u.id=c.contact_id
            WHERE c.user_id=%s AND c.status='accepted' ORDER BY u.display_name
        """, (uid,))
        contacts = [{"id": r[0], "username": r[1], "display_name": r[2], "avatar_url": r[3], "status": r[4], "contact_status": r[5]} for r in cur.fetchall()]
        conn.close()
        return resp(200, {"contacts": contacts})

    if path == "/contacts" and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cid = body.get("contact_id")
        if not cid:
            conn.close()
            return resp(400, {"error": "contact_id обязателен"})
        cur = conn.cursor()
        cur.execute(f"INSERT INTO {SCHEMA}.contacts (user_id, contact_id, status) VALUES (%s,%s,'accepted') ON CONFLICT DO NOTHING", (uid, cid))
        cur.execute(f"INSERT INTO {SCHEMA}.contacts (user_id, contact_id, status) VALUES (%s,%s,'accepted') ON CONFLICT DO NOTHING", (cid, uid))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    if path.startswith("/contacts/") and method == "DELETE":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cid = int(path.split("/")[2])
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.contacts SET status='removed' WHERE (user_id=%s AND contact_id=%s) OR (user_id=%s AND contact_id=%s)", (uid, cid, cid, uid))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    # ── CHANNELS ──────────────────────────────────────────

    if path == "/channels" and method == "GET":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.name, c.description, c.username, c.avatar_url, c.subscribers_count, c.owner_id,
                   (SELECT 1 FROM {SCHEMA}.channel_subscribers WHERE channel_id=c.id AND user_id=%s),
                   (SELECT text FROM {SCHEMA}.channel_posts WHERE channel_id=c.id ORDER BY created_at DESC LIMIT 1),
                   (SELECT created_at FROM {SCHEMA}.channel_posts WHERE channel_id=c.id ORDER BY created_at DESC LIMIT 1)
            FROM {SCHEMA}.channels c
            WHERE c.is_public=TRUE OR c.owner_id=%s
            ORDER BY c.subscribers_count DESC
        """, (uid, uid))
        channels = [{"id": r[0], "name": r[1], "description": r[2], "username": r[3], "avatar_url": r[4], "subscribers_count": r[5], "is_owner": r[6] == uid, "subscribed": bool(r[7]), "last_post": r[8], "last_time": r[9].isoformat() if r[9] else None} for r in cur.fetchall()]
        conn.close()
        return resp(200, {"channels": channels})

    if path == "/channels" and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        name = (body.get("name") or "").strip()
        if not name:
            conn.close()
            return resp(400, {"error": "Название обязательно"})
        cur = conn.cursor()
        cur.execute(f"INSERT INTO {SCHEMA}.channels (name, description, username, is_public, owner_id) VALUES (%s,%s,%s,%s,%s) RETURNING id", (name, body.get("description", ""), body.get("username") or None, body.get("is_public", True), uid))
        chid = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s,%s)", (chid, uid))
        conn.commit()
        conn.close()
        return resp(200, {"id": chid, "name": name})

    if "/subscribe" in path and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        chid = int(path.split("/")[2])
        cur = conn.cursor()
        cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (chid, uid))
        cur.execute(f"UPDATE {SCHEMA}.channels SET subscribers_count=subscribers_count+1 WHERE id=%s", (chid,))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    if "/unsubscribe" in path and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        chid = int(path.split("/")[2])
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.channels SET subscribers_count=GREATEST(0,subscribers_count-1) WHERE id=%s", (chid,))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    if "/posts" in path:
        parts = path.split("/")
        chid = int(parts[2])
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        if method == "GET":
            cur = conn.cursor()
            cur.execute(f"""
                SELECT p.id, p.text, p.file_url, p.views, p.created_at, u.display_name
                FROM {SCHEMA}.channel_posts p LEFT JOIN {SCHEMA}.users u ON u.id=p.user_id
                WHERE p.channel_id=%s ORDER BY p.created_at DESC LIMIT 50
            """, (chid,))
            posts = [{"id": r[0], "text": r[1], "file_url": r[2], "views": r[3], "created_at": r[4].isoformat(), "author": r[5]} for r in cur.fetchall()]
            conn.close()
            return resp(200, {"posts": posts})
        if method == "POST":
            cur = conn.cursor()
            cur.execute(f"SELECT owner_id FROM {SCHEMA}.channels WHERE id=%s", (chid,))
            ch = cur.fetchone()
            if not ch or ch[0] != uid:
                conn.close()
                return resp(403, {"error": "Только владелец может публиковать"})
            cur.execute(f"INSERT INTO {SCHEMA}.channel_posts (channel_id, user_id, text) VALUES (%s,%s,%s) RETURNING id, created_at", (chid, uid, body.get("text", "")))
            pid, cat = cur.fetchone()
            conn.commit()
            conn.close()
            return resp(200, {"id": pid, "text": body.get("text"), "created_at": cat.isoformat()})

    # ── NOTIFICATIONS ─────────────────────────────────────

    if path == "/notifications" and method == "GET":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        cur.execute(f"SELECT id, type, title, body, entity_type, entity_id, is_read, created_at FROM {SCHEMA}.notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 50", (uid,))
        notifs = [{"id": r[0], "type": r[1], "title": r[2], "body": r[3], "entity_type": r[4], "entity_id": r[5], "is_read": r[6], "created_at": r[7].isoformat()} for r in cur.fetchall()]
        conn.close()
        return resp(200, {"notifications": notifs, "unread_count": sum(1 for n in notifs if not n["is_read"])})

    if path == "/notifications/read-all" and method == "POST":
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE user_id=%s", (uid,))
        conn.commit()
        conn.close()
        return resp(200, {"ok": True})

    # ── SEARCH ────────────────────────────────────────────

    if path == "/search" and method == "GET":
        q = (params.get("q") or "").strip()
        conn = get_conn()
        user = get_user(token, conn)
        if not user:
            conn.close()
            return resp(401, {"error": "Не авторизован"})
        uid = user[0]
        if len(q) < 2:
            conn.close()
            return resp(200, {"users": [], "chats": [], "messages": [], "channels": []})
        cur = conn.cursor()
        cur.execute(f"SELECT id, username, display_name, avatar_url, status FROM {SCHEMA}.users WHERE id!=%s AND (username ILIKE %s OR display_name ILIKE %s) LIMIT 10", (uid, f"%{q}%", f"%{q}%"))
        users = [{"id": r[0], "username": r[1], "display_name": r[2], "avatar_url": r[3], "status": r[4]} for r in cur.fetchall()]
        cur.execute(f"SELECT c.id, c.type, c.name FROM {SCHEMA}.chats c JOIN {SCHEMA}.chat_members cm ON cm.chat_id=c.id WHERE cm.user_id=%s AND c.name ILIKE %s LIMIT 10", (uid, f"%{q}%"))
        chats = [{"id": r[0], "type": r[1], "name": r[2]} for r in cur.fetchall()]
        cur.execute(f"""
            SELECT m.id, m.text, m.created_at, c.id, c.name FROM {SCHEMA}.messages m
            JOIN {SCHEMA}.chats c ON c.id=m.chat_id
            JOIN {SCHEMA}.chat_members cm ON cm.chat_id=c.id AND cm.user_id=%s
            WHERE m.text ILIKE %s AND m.is_deleted=FALSE ORDER BY m.created_at DESC LIMIT 20
        """, (uid, f"%{q}%"))
        messages = [{"id": r[0], "text": r[1], "created_at": r[2].isoformat(), "chat_id": r[3], "chat_name": r[4]} for r in cur.fetchall()]
        cur.execute(f"SELECT id, name, description, subscribers_count FROM {SCHEMA}.channels WHERE is_public=TRUE AND name ILIKE %s LIMIT 10", (f"%{q}%",))
        channels = [{"id": r[0], "name": r[1], "description": r[2], "subscribers_count": r[3]} for r in cur.fetchall()]
        conn.close()
        return resp(200, {"users": users, "chats": chats, "messages": messages, "channels": channels})

    return resp(404, {"error": "Not found"})