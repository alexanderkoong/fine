# fine_board_app.py
"""
Self‑contained Flask app for a simple team "fine board" with password‑protected, role‑based access.

• Roles: "viewer" (can only see the fines table) and "upper" (viewer + can propose new fines).
• Storage: single SQLite database file (fines.db) created automatically if missing.
• Auth: username+password (hashed with Werkzeug) kept in the same DB.
• UI: super‑light, pure HTML in the /templates folder, generated on first run if missing.

Setup
-----
1. python -m venv .venv && source .venv/bin/activate  # optional virtual‑env
2. pip install -r requirements.txt                    # see REQUIREMENTS constant below
3. python fine_board_app.py                           # run the server
4. Open http://127.0.0.1:5000/init                    # create tables & two sample users
   • username: captain  | pw: secret   (role="upper")
   • username: rookie   | pw: password (role="viewer")
5. Log in at /login and explore.

Deploy
------
Push the repo to GitHub.  On Render, Fly.io, Railway, or Heroku:
• Set ENV var SECRET_KEY to a strong random string.
• Use the provided "start" command: `gunicorn fine_board_app:app`.
"""
import os
import sqlite3
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    g,
    abort,
    flash,
)
from werkzeug.security import generate_password_hash, check_password_hash

############################################################
# Configuration
############################################################
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "fines.db"
SECRET_KEY = os.environ.get("SECRET_KEY", "dev‑secret‑change‑me")
REQUIREMENTS = """flask==3.0.0
werkzeug==3.0.0
"""

############################################################
# Flask setup
############################################################
app = Flask(__name__)
app.config.update(SECRET_KEY=SECRET_KEY, DATABASE=str(DB_PATH))

############################################################
# Database helpers
############################################################

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"], detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


app.teardown_appcontext(close_db)


def init_db():
    schema = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('viewer','upper'))
    );
    CREATE TABLE IF NOT EXISTS fines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TIMESTAMP NOT NULL,
        offender TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        proposer_id INTEGER NOT NULL,
        FOREIGN KEY(proposer_id) REFERENCES users(id)
    );
    """
    db = get_db()
    db.executescript(schema)
    db.commit()


############################################################
# Auth helpers
############################################################

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


def role_required(role):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            user = get_db().execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
            if user is None or user["role"] != role:
                abort(403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


############################################################
# Template bootstrap (runs once on startup)
############################################################

def ensure_templates():
    tpl_dir = BASE_DIR / "templates"
    tpl_dir.mkdir(exist_ok=True)

    templates = {
        "base.html": """<!doctype html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Fine Board</title>
    <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/picnic'>
    <style>
        body{max-width:800px;margin:0 auto;padding:0 1rem;font-family:system-ui,-apple-system,sans-serif;}
        table{width:100%;border-collapse:collapse;margin:1rem 0;}
        th,td{padding:0.5rem;text-align:left;border-bottom:1px solid #ddd;}
        th{background-color:#f8f9fa;font-weight:600;}
        header{background-color:#0a2e5c;padding:1.75rem 1rem 1.5rem;margin-bottom:2rem;color:white;border-radius:0 0 8px 8px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
        h1{color:#fff;margin:0 0 0.5rem 0;padding-top:0.5rem;font-size:1.75rem;text-shadow:1px 1px 2px rgba(0,0,0,0.3);}
        .user-info{color:#e1e7ed;font-size:0.95rem;margin-bottom:0.5rem;}
        .user-info a{color:#fff;text-decoration:underline;}
        .actions{margin:1rem 0;}
        .actions a{display:inline-block;margin-right:1rem;padding:0.5rem 1rem;background-color:#007bff;color:white;text-decoration:none;border-radius:4px;}
        .actions a:hover{background-color:#0056b3;}
        .remove-btn{background-color:#dc3545 !important;color:white !important;border:none !important;padding:0.5rem 0.75rem !important;font-size:0.9rem !important;margin:0 !important;border-radius:4px !important;cursor:pointer !important;font-weight:500 !important;box-shadow:0 1px 3px rgba(0,0,0,0.1) !important;transition:all 0.2s !important;}
        .remove-btn:hover{background-color:#c82333 !important;transform:translateY(-1px) !important;box-shadow:0 2px 4px rgba(0,0,0,0.2) !important;}
        .flash-messages{background-color:#d4edda;border:1px solid #c3e6cb;color:#155724;padding:0.75rem;border-radius:4px;margin-bottom:1rem;}
    </style>
</head>
<body>
<header>
    <h1>Team Fine System</h1>
    {% if g.user %}
      <div class="user-info">Logged in as <strong>{{ g.user['username'] }}</strong> · <a href='{{ url_for('logout') }}'>Logout</a></div>
    {% endif %}
    <hr>
</header>
{% with messages = get_flashed_messages() %}
  {% if messages %}
    <div class="flash-messages">
      {% for m in messages %}{{ m }}{% endfor %}
    </div>
  {% endif %}
{% endwith %}
{% block content %}{% endblock %}
</body>
</html>""",
        "index.html": """{% extends 'base.html' %}
{% block content %}
{% if fines %}
<table>
  <thead><tr><th>Date</th><th>Offender</th><th>Description</th><th>Amount ($)</th><th>Proposed By</th><th>Actions</th></tr></thead>
  <tbody>
  {% for f in fines %}
  <tr>
    <td>{{ f['date'][:10] }}</td>
    <td>{{ f['offender'] }}</td>
    <td>{{ f['description'] }}</td>
    <td>{{ '%.2f'|format(f['amount']) }}</td>
    <td>{{ f['proposer_name'] }}</td>
    <td>
      <form method='post' action='{{ url_for('remove_fine', fine_id=f['id']) }}' style='display:inline;' onsubmit='return confirm("Are you sure you want to remove this fine?")'>
        <button type='submit' class='remove-btn'>Remove</button>
      </form>
    </td>
  </tr>
  {% endfor %}
  </tbody>
</table>
{% else %}<p>No fines yet!</p>{% endif %}
<div class="actions">
  <a href='{{ url_for('totals') }}'>📊 View Totals</a>
  {% if g.user['role']=='upper' %}
    <a href='{{ url_for('add') }}'>➕ Propose a new fine</a>
  {% endif %}
</div>
{% endblock %}""",
        "login.html": """{% extends 'base.html' %}
{% block content %}
<form method='post'>
  <label>Username <input name='username' required></label><br>
  <label>Password <input type='password' name='password' required></label><br>
  <button type='submit'>Log In</button>
</form>
{% endblock %}""",
        "add.html": """{% extends 'base.html' %}
{% block content %}
<form method='post'>
  <label>Offender 
    <select name='offender' required>
      <option value=''>Select an offender</option>
      <option value='Koong'>Koong</option>
      <option value='Noah'>Noah</option>
      <option value='Zander'>Zander</option>
      <option value='James'>James</option>
      <option value='Toby'>Toby</option>
      <option value='Lukas'>Lukas</option>
      <option value='Elliot'>Elliot</option>
      <option value='Cole'>Cole</option>
      <option value='Theo'>Theo</option>
      <option value='Robert'>Robert</option>
    </select>
  </label><br>
  <label>Description <textarea name='description' id='description' required></textarea></label><br>
  <label id='amount-label'>Amount ($)<input type='number' step='0.01' name='amount' id='amount' required></label><br>
  <button type='submit'>Submit Fine</button>
</form>
<script>
document.getElementById('description').addEventListener('input', function() {
  var amountField = document.getElementById('amount');
  var amountLabel = document.getElementById('amount-label');
  if (this.value.trim() === 'Fine Warning') {
    amountField.removeAttribute('required');
    amountLabel.innerHTML = 'Amount ($) <span style="color: #666;">(optional for warnings)</span><input type="number" step="0.01" name="amount" id="amount">';
  } else {
    amountField.setAttribute('required', 'required');
    amountLabel.innerHTML = 'Amount ($)<input type="number" step="0.01" name="amount" id="amount" required>';
  }
});
</script>
{% endblock %}""",
        "totals.html": """{% extends 'base.html' %}
{% block content %}
<h2>Fine Totals</h2>
{% if totals %}
<table>
  <thead><tr><th>Offender</th><th>Total Amount ($)</th><th>Number of Fines</th></tr></thead>
  <tbody>
  {% for total in totals %}
  <tr>
    <td>{{ total['offender'] }}</td>
    <td>{{ '%.2f'|format(total['total_amount']) }}</td>
    <td>{{ total['fine_count'] }}</td>
  </tr>
  {% endfor %}
  </tbody>
</table>
<p><strong>Grand Total: ${{ '%.2f'|format(grand_total) }}</strong></p>
{% else %}<p>No fines recorded yet!</p>{% endif %}
<p><a href='{{ url_for('index') }}'>← Back to Fines</a></p>
{% endblock %}""",
    }

    for fname, content in templates.items():
        path = tpl_dir / fname
        if not path.exists():
            path.write_text(content, encoding="utf-8")


ensure_templates()

############################################################
# Routes
############################################################

@app.before_request
def load_logged_in_user():
    user_id = session.get("user_id")
    if user_id:
        g.user = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    else:
        g.user = None
    
    # Redirect to login if accessing protected routes without authentication
    if request.endpoint and request.endpoint not in ['login', 'static', 'init'] and g.user is None:
        return redirect(url_for('login'))


@app.route("/init")
def init():
    """Initialize DB and add demo users and sample fines."""
    init_db()

    db = get_db()
    # Only seed if table empty
    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO users(username,password_hash,role) VALUES (?,?,?)",
            [
                ("captain", generate_password_hash("secret"), "upper"),
                ("rookie", generate_password_hash("password"), "viewer"),
                ("alexkoong", generate_password_hash("password123"), "upper"),
                ("noahhernandez", generate_password_hash("password123"), "upper"),
                ("zanderbravo", generate_password_hash("password123"), "upper"),
                ("james lian", generate_password_hash("password123"), "upper"),
            ],
        )
        db.commit()
    
    # Add sample fines if none exist
    if db.execute("SELECT COUNT(*) FROM fines").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO fines(date, offender, description, amount, proposer_id) VALUES (?,?,?,?,?)",
            [
                (datetime.utcnow().isoformat(timespec="seconds"), "Koong", "Late to meeting", 5.00, 1),
                (datetime.utcnow().isoformat(timespec="seconds"), "Noah", "Left dishes in sink", 3.50, 1),
                (datetime.utcnow().isoformat(timespec="seconds"), "Zander", "Forgot to take out trash", 2.00, 3),
            ],
        )
        db.commit()
    
    return "✅ Database initialized with demo users and sample fines. Go to /login."  # plain text response


@app.route("/")
@login_required
def index():
    fines = get_db().execute(
        """
        SELECT f.*, u.username AS proposer_name
        FROM fines f JOIN users u ON f.proposer_id = u.id
        ORDER BY date DESC
        """
    ).fetchall()
    return render_template("index.html", fines=fines)


@app.route("/add", methods=["GET", "POST"])
@role_required("upper")
def add():
    if request.method == "POST":
        offender = request.form["offender"].strip()
        description = request.form["description"].strip()
        amount_str = request.form["amount"].strip()
        
        # For Fine Warning, amount is optional - default to 0 if not provided
        if description == "Fine Warning" and not amount_str:
            amount = 0.0
        else:
            amount = float(amount_str) if amount_str else 0.0
            
        get_db().execute(
            "INSERT INTO fines(date, offender, description, amount, proposer_id) VALUES (?,?,?,?,?)",
            (datetime.utcnow().isoformat(timespec="seconds"), offender, description, amount, g.user["id"]),
        )
        get_db().commit()
        flash("Fine recorded ✅")
        return redirect(url_for("index"))
    return render_template("add.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        user = get_db().execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session.clear()
            session["user_id"] = user["id"]
            return redirect(url_for("index"))
        flash("❌ Invalid credentials, try again.")
    return render_template("login.html")


@app.route("/totals")
@login_required
def totals():
    totals = get_db().execute(
        """
        SELECT offender, SUM(amount) as total_amount, COUNT(*) as fine_count
        FROM fines
        WHERE description != 'Fine Warning'
        GROUP BY offender
        ORDER BY total_amount DESC
        """
    ).fetchall()
    
    grand_total = get_db().execute(
        "SELECT SUM(amount) as total FROM fines WHERE description != 'Fine Warning'"
    ).fetchone()["total"] or 0
    
    return render_template("totals.html", totals=totals, grand_total=grand_total)


@app.route("/remove_fine/<int:fine_id>", methods=["POST"])
@login_required
def remove_fine(fine_id):
    # Any logged in user can remove fines now
    
    # Get the fine to check if it exists
    fine = get_db().execute("SELECT * FROM fines WHERE id = ?", (fine_id,)).fetchone()
    if not fine:
        flash("❌ Fine not found.")
        return redirect(url_for("index"))
    
    # Remove the fine
    get_db().execute("DELETE FROM fines WHERE id = ?", (fine_id,))
    get_db().commit()
    
    flash("✅ Fine removed successfully.")
    return redirect(url_for("index"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


############################################################
# Entrypoint
############################################################

if __name__ == "__main__":
    print("Running with Flask built‑in server (development only)…")
    print("• Visit http://127.0.0.1:5000/init once to set up the database.")
    app.run(debug=True, port=5001)
