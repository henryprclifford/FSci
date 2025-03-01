import os
import logging
import requests
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'supersecretkey')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwtsecretkey')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
CORS(app, origins=os.environ.get('CORS_ORIGINS', 'http://127.0.0.1:5500').split(','))
jwt = JWTManager(app)

UPLOAD_FOLDER = "static/profile_pics"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# In-memory storage for recent searches per user
user_recent_searches = {}

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.Text, default="")
    profile_picture = db.Column(db.String(200), default="default-profile.png")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "bio": self.bio,
            "profile_picture": self.profile_picture
        }

with app.app_context():
    db.create_all()

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(username=username, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        logging.error("Error in signup: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        token = create_access_token(identity=user.id)
        return jsonify({'message': 'Login successful', 'token': token, 'user': user.to_dict()}), 200
    except Exception as e:
        logging.error("Error in login: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user.to_dict()), 200
    except Exception as e:
        logging.error("Error in get_profile: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if request.content_type.startswith('multipart/form-data'):
            bio = request.form.get("bio", user.bio)
            user.bio = bio
            if "profile_picture" in request.files:
                image = request.files["profile_picture"]
                filename = secure_filename(image.filename)
                image_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                image.save(image_path)
                user.profile_picture = f"/static/profile_pics/{filename}"
        else:
            data = request.get_json()
            user.bio = data.get("bio", user.bio)
            user.profile_picture = data.get("profile_picture", user.profile_picture)
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200
    except Exception as e:
        logging.error("Error in update_profile: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/recommend', methods=['POST'])
@jwt_required()
def recommend():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # ADDED FOR DEBUGGING:
        logging.debug("Incoming request data: %s", data)

        genre = data.get("genre")
        author = data.get("author")
        year = data.get("year")

        # ADDED FOR DEBUGGING:
        logging.debug("Parsed genre: %r, author: %r, year: %r", genre, author, year)

        # Log the user's search for recent searches
        search_entry = {
            "genre": genre if genre else "Any",
            "author": author if author else "Any",
            "year": year if year else "Any"
        }
        if user_id in user_recent_searches:
            user_recent_searches[user_id].append(search_entry)
            if len(user_recent_searches[user_id]) > 10:
                user_recent_searches[user_id] = user_recent_searches[user_id][-10:]
        else:
            user_recent_searches[user_id] = [search_entry]
        
        # Build parameters for Open Library API
        base_url = "https://openlibrary.org/search.json"
        params = {}
        if genre:
            params["subject"] = genre
        if author:
            params["author"] = author
        if year:
            try:
                year_int = int(year)
                params["first_publish_year"] = year_int
            except ValueError:
                pass

        # ADDED FOR DEBUGGING:
        logging.debug("Constructed query params: %s", params)

        resp = requests.get(base_url, params=params)

        # ADDED FOR DEBUGGING:
        logging.debug("Open Library URL: %s", resp.url)
        logging.debug("Status code from Open Library: %s", resp.status_code)
        logging.debug("Raw response from Open Library: %s", resp.text)

        resp.raise_for_status()
        data_json = resp.json()

        docs = data_json.get("docs", [])
        # If year is provided, filter docs for an exact match on first_publish_year
        if year:
            try:
                year_int = int(year)
                docs = [doc for doc in docs if doc.get("first_publish_year") == year_int]
            except ValueError:
                pass
        
        docs = docs[:5]  # Limit to 5 results
        recommendations = []
        for doc in docs:
            title = doc.get("title") or "No Title"
            author_name = doc.get("author_name", ["Unknown"])[0] if doc.get("author_name") else "Unknown"
            publish_year = doc.get("first_publish_year") or "N/A"
            cover_id = doc.get("cover_i")
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None

            recommendations.append({
                "title": title,
                "author": author_name,
                "year": publish_year,
                "cover_url": cover_url
            })
        
        return jsonify({"recommendations": recommendations}), 200

    except requests.exceptions.RequestException as re:
        logging.error("External API request failed: %s", re)
        return jsonify({"error": "Failed to fetch data from external API"}), 500
    except Exception as e:
        logging.error("Error in recommend: %s", e)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/recent-searches', methods=['GET'])
@jwt_required()
def recent_searches():
    try:
        user_id = get_jwt_identity()
        searches = user_recent_searches.get(user_id, [])
        return jsonify({"recent_searches": searches}), 200
    except Exception as e:
        logging.error("Error in recent_searches: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    try:
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        logging.error("Error in logout: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route("/upload-profile-pic", methods=["POST"])
def upload_profile_pic():
    try:
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        file = request.files["profile_picture"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        return jsonify({"profile_picture": f"/static/profile_pics/{filename}"}), 200
    except Exception as e:
        logging.error("Error in upload_profile_pic: %s", e)
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)
