import firebase_admin
from firebase_admin import db
import json


cred_obj = firebase_admin.credentials.Certificate('data_processing/coastline-d884f-firebase-adminsdk-idvcu-9d69b83e4f.json')
default_app = firebase_admin.initialize_app(cred_obj, {
    'databaseURL': 'https://coastline-d884f-default-rtdb.firebaseio.com/'
})

ref = db.reference('/')

with open('data_processing/chunks/c.json') as json_file:
    data = json.load(json_file)
ref.set(data)