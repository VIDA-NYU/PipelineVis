import pkg_resources
import json

def get_heartstatlog_data():
    data_path = pkg_resources.resource_filename(__name__, "data/teaser_data_heartstatlog.json")
    with open(data_path, "r") as f:
        data = json.load(f)
    return data