import firebase_admin
from firebase_admin import db
import json
import tqdm

cred_obj = firebase_admin.credentials.Certificate('data_processing/coastline-d884f-firebase-adminsdk-idvcu-9d69b83e4f.json')
default_app = firebase_admin.initialize_app(cred_obj, {
    'databaseURL': 'https://coastline-d884f-default-rtdb.firebaseio.com/'
})

ref = db.reference('/')

resolutions = ['c', 'l', 'i', 'h', 'f']
data = {}
for resolution in resolutions:
    with open('data_processing/chunks/{}.json'.format(resolution)) as json_file:
        d = json.load(json_file)
        # merge d into data
        data.update(d)
print(data.keys())
# upload data to firebase in batches of 100
for i in tqdm.tqdm(range(0, len(data.keys()), 100)):
    keys = list(data.keys())[i:i+100]
    batch = {}
    for key in keys:
        batch[key] = data[key]
    ref.update(batch)
