from flask import Flask, render_template, request, jsonify, redirect, abort
import html
import logging
import psycopg2
import os
import time
from security import verify_signature, sign_client_id

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
database_url = os.getenv("DATABASE_URL")
SECRET_ADMIN_KEY = os.getenv("PASSWORD")

def clean(text: str) -> str:
    """ Function to prevent XSS (screw you, dirty hacker.) """
    return str(html.escape(text, quote=True))

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
@app.route("/isbanned", methods=["POST"])
def is_user_banned():
    user_id = request.json.get("userId")
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT EXISTS (SELECT 1 FROM banned WHERE userId = %s)", (user_id,))
        result = cur.fetchone()[0]
        cur.close()
        return jsonify({"status": str(result).lower()})

@app.route("/")
def home():
    return render_template("index.html")

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

@app.route("/get_signature", methods=["POST"])
def get_signature():
    data = request.json
    if not data:
        return jsonify({"error": "Where's your JSON? did you forget it like how your dad forgot you?"})
    return jsonify({
        "signature": sign_client_id(data.get("clientId"))
    }), 200

@app.route("/deletePost", methods=["POST"])
def deletePost():
    with get_connection() as conn:
        data = request.json
        if not data:
            return jsonify({"error": "Where's your JSON? did you forget it like how your dad forgot you?"})
        client_id = data.get("clientId")
        signature = data.get("signature")
        postId = data.get("postId")
        if not client_id or not signature or not postId: return jsonify({
            "error": 'Why.'
        })
        expected_sig = sign_client_id(client_id)
        if not verify_signature(client_id, signature):
            return jsonify({"error": "Thought you could trick me, asshole?! You can't! Suck my balls!"}), 400
        
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM posts where id= %s", (postId, ))
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
    userId = data.get("userId")
    signature = data.get("signature")
    if not verify_signature(userId, signature):
        return jsonify({
            "error": '<img src="https://thewall.up.railway.app/static/teto.gif" alt="teto">'
        })
    insert_post(content, userId)
    return redirect("/") # don't ask why i do this, it works this way trust me




if __name__ == "__main__": app.run(debug=True)

