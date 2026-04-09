import secrets
from flask import Flask, render_template, request, jsonify, redirect, abort, session
import logging
import psycopg2
import os
import time
from flask_wtf import CSRFProtect
import bleach
logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
csrf = CSRFProtect(app)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(16))
database_url = os.getenv("DATABASE_URL")
SECRET_ADMIN_KEY = os.getenv("PASSWORD")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True
)   
csrf.init_app(app)
def clean(text: str) -> str:
    """ Function to prevent XSS (screw you, dirty hacker.) """
    return bleach.clean(text=text)

def get_connection():
    retry_count = 5
    for i in range(retry_count):
        try:
            conn = psycopg2.connect(database_url)
            return conn
        except Exception as e:
            logging.error(f"Attempt {i} failed: {e}")
            time.sleep(2 ** i)
    raise Exception("I can't connect :(")

def init_db():
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
            CREATE TABLE IF NOT EXISTS posts(
                id SERIAL PRIMARY KEY,
                post TEXT NOT NULL,
                userID TEXT NOT NULL
            );""")
            conn.commit()
            cur.close()
            conn.close()
    except Exception as e:
        logging.error(f"Error occured initializing the database. {e}")

init_db()

# ban routes
def require_password():
    if request.headers.get('X-API-KEY') != SECRET_ADMIN_KEY:
        abort(403)


@app.route("/ban")
def add_ban():
    require_password()
    userid = request.args.get("userID")
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO banned (userId) VALUES (%s)", (userid, ))
        conn.commit()
        cur.close()
        return f"Banned {userid}!"
    
@app.route("/removeban")
def unban():
    require_password()
    userid = request.args.get("userid")
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM banned WHERE userId = %s", (userid, ))
        conn.commit()
        cur.close()
        return f"Unbanned {userid}!"
    
@app.route("/viewbanned")
def view():
    require_password()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM banned")
        return cur.fetchall()
    
def init_banned_db():
    try:
        with get_connection() as conn:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("""
            CREATE TABLE IF NOT EXISTS banned(
                id SERIAL PRIMARY KEY,
                userId TEXT NOT NULL          
            )
            """)
            conn.commit()
            cur.close()
            conn.close()
    except Exception as e:
        logging.error(f"Error occured preparing the banned database. {e}")

init_banned_db()
@app.route("/isbanned", methods=["GET"])
def is_user_banned():
    user_id = session.get("uid")
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT EXISTS (SELECT 1 FROM banned WHERE userId = %s)", (user_id,))
        result = cur.fetchone()[0]
        cur.close()
        return jsonify({"status": str(result).lower()})

@app.route("/")
def home():
    if "uid" not in session:
        session["uid"] = secrets.token_hex(32)
    return render_template("index.html", uid=session["uid"])

def insert_post(post, userID):
    with get_connection() as conn:
        try:
            cur = conn.cursor()
            cur.execute("INSERT INTO posts (post, userID) VALUES (%s, %s)", (post, userID))
            conn.commit()
            cur.close()
        except Exception as e:
            logging.error(f"Error inserting post: {e}")

@app.route("/posts", methods=["GET"])
def retrieve_data():
    with get_connection() as conn:
       cursor = conn.cursor()
       cursor.execute("SELECT * FROM posts ORDER BY id ASC")
       rows = cursor.fetchall()
       #jsondata = {index: item for index, item in enumerate(rows)}
    return jsonify(rows)

@app.route("/deletePost", methods=["POST"])
def deletePost():
    with get_connection() as conn:
        uid = session.get("uid")
        data = request.json
        if not data:
            return jsonify({"error": "Invalid Input"}), 400
        postId = data.get("postId")
        if not postId: return jsonify({
            "error": 'Invalid Input'
        }), 400
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM posts where id= %s AND userId= %s", (postId, uid))
            conn.commit()
            cur.close()
            return jsonify({"status": "gone"})
        except Exception as e:
            logging.error(e)
            return jsonify({"error": "unexpected error occured, what the fuck?!"})
        

@app.route("/post", methods=["POST"])
def post():
    data = request.get_json()
    content = clean(data.get("content"))
    userId = session.get("uid")
    insert_post(content, userId)
    return redirect("/") # don't ask why i do this, it works this way trust me




if __name__ == "__main__": app.run(debug=True)

