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
resolutions = ['c', 'l', 'i', 'h']
data = {}
for resolution in resolutions:
    with open('data_processing/chunks/{}.json'.format(resolution)) as json_file:
        d = json.load(json_file)
        # merge d into data
        data.update(d)
keys = list(data.keys())


batchsize = 1000
# upload data to firebase in batches
for i in tqdm.tqdm(range(0, len(keys), batchsize)):
    keys = list(data.keys())[i:i+batchsize]
    batch = {}
    for key in keys:
        batch[key] = data[key]
    ref.update(batch)
