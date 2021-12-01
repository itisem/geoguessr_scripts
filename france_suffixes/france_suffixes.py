import csv
import unidecode
import plotly.express as px
import plotly.graph_objects as go
import pandas

limit = 45 #ignore anything that is actually just super rare
suffix_length = 2
suffixes = {}
suffixes_clean = {}
f = open("ville.csv", "r") #you can download this from galichon.com/codesgeo
reader = csv.reader(f)
header = next(reader)
france = list(reader)
for i in range(len(france)):
    problem = False
    name = unidecode.unidecode(france[i][0].strip().replace(" ","-")).lower()
    try:
        latitude = float(france[i][5])
        longitude = float(france[i][6])
        france[i] = {"name":name, "latitude":latitude, "longitude":longitude}
        suffix = name[-suffix_length:]
        if not(suffix in suffixes):
            suffixes[suffix] = {"name":[],"latitude":[],"longitude":[]}
        suffixes[suffix]["name"].append(name)
        suffixes[suffix]["latitude"].append(latitude)
        suffixes[suffix]["longitude"].append(longitude)
    except: #ignore any missing coordinates
        pass
for suffix in suffixes:
    if len(suffixes[suffix]["name"]) >= limit:
        suffixes_clean[suffix] = suffixes[suffix]
for suffix in suffixes_clean:
    df = pandas.DataFrame(suffixes_clean[suffix])
    fig = px.scatter_mapbox(df, lat = "latitude", lon = "longitude", hover_name = "name", color_discrete_sequence = ["fuchsia"], height = 1000, width = 1000, zoom = 5)
    fig.update_layout(mapbox_style = "open-street-map", mapbox = dict(center=go.layout.mapbox.Center(lat=46.5,lon=1.5)))
    fig.write_html("./twoletters/"+suffix+".html")