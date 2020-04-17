import json
from qwikidata.entity import WikidataItem, WikidataLexeme, WikidataProperty
from qwikidata.linked_data_interface import get_entity_dict_from_api
import glob

data = []
cities_data, countries_data = {}, {}
with open('data/data.json', 'w') as fout:
    for file in glob.glob('data/cities/*.json'):
        with open(file, 'r') as fin:
            datar = json.load(fin)
            for i in datar:
                data.append(i)
    fout.write(json.dumps(data, indent=2))

with open('data/cities.json', 'r') as cities, open('data/countries.json', 'r') as countries:
    cities_data, countries_data = json.load(cities), json.load(countries)
    keys = []
    for city in data:
        if str(city['id']) not in cities_data:
            print(city['id'])
            wikidata_id = 'Q' + str(city['id'])
            wikidata_info = get_entity_dict_from_api(wikidata_id)
            name = wikidata_info['labels']['en']['value']
            coords = wikidata_info['claims']['P625'][0]['mainsnak']['datavalue']['value']
            lat, lon = coords['latitude'], coords['longitude']
            cities_data[str(city['id'])] = {
                'name': name,
                'lat': lat,
                'lon': lon
            }
        for country in city['data'].values():
            if str(country) in countries_data:
                continue
            print(country)
            wikidata_id = 'Q' + str(country)
            wikidata_info = get_entity_dict_from_api(wikidata_id)
            name = wikidata_info['labels']['en']['value']
            countries_data[str(country)] = {
                'name': name
            }

with open('data/cities.json', 'w') as cities, open('data/countries.json', 'w') as countries:
    cities.write(json.dumps(cities_data, indent=2))
    countries.write(json.dumps(countries_data, indent=2))

