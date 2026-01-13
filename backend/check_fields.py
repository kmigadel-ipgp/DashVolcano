from pymongo import MongoClient
import os

# Load MongoDB connection string
mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client['gvp']
collection = db['samples']

# Find one sample and check if these fields exist
sample = collection.find_one({'volcano_number': 360060})
if sample:
    print('Sample _id:', sample.get('_id'))
    print('geological_age present:', 'geological_age' in sample)
    print('eruption_date present:', 'eruption_date' in sample)
    print('\ngeological_age:', sample.get('geological_age'))
    print('eruption_date:', sample.get('eruption_date'))
    print('\nAll keys:', list(sample.keys())[:30])
else:
    print('No sample found')
