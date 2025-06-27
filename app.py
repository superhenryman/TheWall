from flask import Flask, render_template, request, jsonify, redirect
import html
import logging
import psycopg2
import os
import time

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
database_url = os.getenv("DATABASE_URL")

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
            print(f"Attempt {i} failed: {e}")
            time.sleep(2 ** i)
    raise Exception("I can't connect :(")

def init_db():
    try:
        with get_connection() as conn:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("""
            CREATE TABLE IF NOT EXISTS posts(
                id SERIAL PRIMARY KEY,
                post TEXT NOT NULL
            );""")
            conn.commit()
            cur.close()
            conn.close()
    except Exception as e:
        logging.error(f"Error occured initializing the database. {e}")

init_db()

@app.route("/")
def home():
    return render_template("index.html")

def insert_post(post):
    with get_connection() as conn:
        try:
            cur = conn.cursor()
            cur.execute("INSERT INTO posts (post) VALUES (%s)", (post, ))
            conn.commit()
        except Exception as e:
            logging.error(f"Error occured when inserting the post contents. {e}")


@app.route("/posts", methods=["GET"])
def retrieve_data():
    with get_connection() as conn:
       cursor = conn.cursor()
       cursor.execute("SELECT * FROM posts ORDER BY id ASC")
       rows = cursor.fetchall()
       #jsondata = {index: item for index, item in enumerate(rows)}
    return jsonify(rows)

@app.route("/post", methods=["POST"])
def post():
    content = request.form.get("content")
    insert_post(clean(content))
    return redirect("/")

if __name__ == "__main__": app.run(debug=True)

