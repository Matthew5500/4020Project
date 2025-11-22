from flask import Flask, request, jsonify
import pymysql
import bcrypt

app = Flask(__name__)

def get_conn():
    return pymysql.connect(
        host="mysql-db",        # container name (on backend-net)
        port=3306,
        user="auction_user",
        password="4020auctionuser",
        database="auction_DB",
        cursorclass=pymysql.cursors.DictCursor,
    )

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    required = ["username", "password", "email", "firstName", "lastName", "phone"]
    missing = [f for f in required if f not in data or not data[f]]
    if missing:
        return jsonify({"error": f"Missing field(s): {', '.join(missing)}"}), 400

    username = data["username"]
    email = data["email"]
    first_name = data["firstName"]
    last_name = data["lastName"]
    phone = data["phone"]
    raw_password = data["password"]

    # bcrypt hash
    pw_hash = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
    pw_hash_str = pw_hash.decode("utf-8")

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users
                  (username, email, password_hash, first_name, last_name, phone)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (username, email, pw_hash_str, first_name, last_name, phone),
            )
        conn.commit()
    except pymysql.err.IntegrityError:
        # likely duplicate username/email
        return jsonify({"error": "Username or email already exists"}), 409
    finally:
        conn.close()

    return jsonify({"status": "ok", "username": username}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}

    required = ["username", "password"]
    missing = [f for f in required if f not in data or not data[f]]
    if missing:
        return jsonify({"error": f"Missing field(s): {', '.join(missing)}"}), 400

    username = data["username"]
    raw_password = data["password"]

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, username, email, password_hash,
                       first_name, last_name, phone
                FROM users
                WHERE username = %s
                """,
                (username,),
            )
            user = cur.fetchone()
    finally:
        conn.close()

    if not user:
        # user not found
        return jsonify({"error": "Invalid username or password"}), 401

    stored_hash = user["password_hash"]
    if not bcrypt.checkpw(raw_password.encode("utf-8"), stored_hash.encode("utf-8")):
        # password mismatch
        return jsonify({"error": "Invalid username or password"}), 401

    # Don't return password_hash
    user_info = {
        "userId": user["user_id"],
        "username": user["username"],
        "email": user["email"],
        "firstName": user["first_name"],
        "lastName": user["last_name"],
        "phone": user["phone"],
    }

    return jsonify({"status": "ok", "user": user_info}), 200


if __name__ == "__main__":
    # Listen on all interfaces, port 8000
    app.run(host="0.0.0.0", port=8000)
