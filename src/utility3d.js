/* ServiceMap3D.
   Copyright (C) 2017 DISIT Lab http://www.disit.org - University of Florence

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, either version 3 of the
   License, or (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. */
/*
 API
 Service Info
 http://servicemap.disit.org/WebAppGrafo/api/v1/?serviceUri=URI[&lang=en|it]&format=[json|html]
 Service Search
 http://servicemap.disit.org/WebAppGrafo/api/v1?selection=sel&categories=[listOfCategories]&maxResults=nResults&maxDists=dists[&text=keywords][&lang=en|it]&format=[json|html]
 Full text search
 http://servicemap.disit.org/WebAppGrafo/api/v1?search=<text>&[selection=<lat>;<lng>&maxDists=dist&]maxResults=<nResults>[&lang=it|en]&format=[json|html]
 Location search
 http://servicemap.disit.org/WebAppGrafo/api/v1/location?position=<lat>;<lng>
 */

var viewer = null;
var scene = null;
var handler = null;
var selezione = "";
var latitudeString = 0;
var longitudeString = 0;
var gpsActive = 0;
var tipo_cat = "categorie";
var countForLoading = 0;
var apiBase = "http://servicemap.disit.org/WebAppGrafo/api/";
var bingMapsKey = '... bing api key...';

function mapLoad() {
	Cesium.BingMapsApi.defaultKey = bingMapsKey;
    viewer = new Cesium.Viewer('cesiumContainer', {
        imageryProvider: new Cesium.BingMapsImageryProvider({
            url: '//dev.virtualearth.net',
            mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
        }),
        entities: Cesium.EntityCollection(),
        baseLayerPicker: false,
        homeButton: false,
        timeline: false,
        animation: false
    });
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(9.9052074, 43.3499962, 370000),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0
        }
    });
    scene = viewer.scene;
    handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(function(click) {
        if (realtimeWorker != null) {
            stopAutoplay();
        }
        var clicked = pickEntity(click.position);
        if (clicked != undefined) {
            if (clicked.type === "Services") {
                loadServiceDescription(clicked);
            }
            if (clicked.type === "SensorSites") {
                loadSensorSiteDescription(clicked);
            }
            if (clicked.type === "Parcheggio auto") {
                loadCarParkDescription(clicked);
            }
            if (clicked.type === "BusStops") {
                loadBusStopDescription(clicked);
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    $.ajaxSetup({
        async: true
    });
}

function ricercaServizi() {
    //reset "situation"
    countForLoading = 0;
    stopAutoplay();
    $('#legenda').hide();
    $('#fattorescala').hide();
    $('#autoplay_query').hide();
    //start getting informations
    if (selezione.length == 0 && $('#raggioricerca').val() != "area") {
        window.alert("Nessun luogo selezionato!");
        return 0;
    }
    var apiLink = apiBase + "v1/?selection=";
    if ($('#raggioricerca').val() != "area") {
        apiLink += selezione;
    } else { //se selezionata AREA VISIBILE
        var area = getAreaVisibile();
        if (area != null) {
            apiLink += area[0] + ";" + area[1] + ";" + area[2] + ";" + area[3] + "&raggioservizi=area";
        } else
            return null;
    }
    var categorie = null;
    if (tipo_cat != "3d_data") {
        categorie = getCategorie();
    } else {
        categorie = getCategorie3D();
    }
    if (categorie.length === 0) {
        window.alert("Nessuna categoria selezionata!");
        return 0;
    }
    apiLink += "&categories=";
    for (var c of categorie) {
        apiLink += c + ";";
    }
    //        apiLink = apiLink.substring(0, apiLink.length - 1);
    nResults = $('#nResultsServizi').val();
    apiLink += "&maxResults=" + nResults;
    if ($('#raggioricerca').val() != "area") {
        dists = $('#raggioricerca').val();
        apiLink += "&maxDists=" + dists;
    }
    keywords = $('#serviceTextFilter').val();
    apiLink += "&text=" + keywords;
    apiLink += "&lang=it" + "&format=json";
    if (tipo_cat != "3d_data") {
        parseJSON(apiLink);
    } else {
        jsonURL = apiLink;
        manage3DDatas();
    }
    gpsActive = 0;
}

function getCategorie() {
    // ESTRAGGO LE CATEGORIE SELEZIONATE
    var categorie = [];
    var nCatAll = 0;
    var count = 0;
    $('#' + tipo_cat + ' .macrocategory:checked').each(function() {
        if ($('#' + tipo_cat + ' .sub_' + $(this).val() + ":not(:checked)").length == 0) {
            categorie.push($(this).val());
            if ($(this).val() == "TransferServiceAndRenting") {
                categorie.push("BusStop");
                categorie.push("SensorSite");
            }
            if ($(this).val() == "Path") {
                categorie.pop("Path");
                categorie.push("Cycle_paths");
                categorie.push("Tourist_trail");
                categorie.push("Tramline");
            }
            if ($(this).val() == "Area") {
                categorie.pop("Area");
                categorie.push("Gardens");
                categorie.push("Green_areas");
                categorie.push("Controlled_parking_zone");
            }
            // CODICE PER EVENTI NEI TRASVERSALI
            if ($(this).val() == "HappeningNow") {
                categorie.pop("HappeningNow");
                categorie.push("Event");
            }
            nCatAll++;
        } else
            $('#' + tipo_cat + ' .sub_' + $(this).val() + ":checked").each(function() {
                categorie.push($(this).val());
            });
    });
    if (nCatAll == $('#' + tipo_cat + ' .macrocategory').length) {
        categorie = ["Service"];
        categorie.push("BusStop");
        categorie.push("SensorSite");
        if (tipo_cat == 'categorie_t') {
            categorie.push("Event");
            categorie.push("PublicTransportLine");
        }
    }
    return categorie;
}

function parseJSON(jsonURL) {
    $('#loading').show();
    nessunrisultato = true;
    //PARSING DEL JSON E POSIZIONAMENTO PIN
    if (viewer.entities != null)
        viewer.entities.removeAll();
    sensorSitesInMap = false;
    $('#dati-roadsensors').hide();
    
    $.ajax({
        url: jsonURL,
        async: true,
        datatype: "json",
        success: function(data) {
            $.each(data, function(key, val) {
                if (key == "Services")
                    for (var feature of val.features) {
                        countForLoading++;
                        nessunRisultato = false;
                        addServiceToMap(feature, key);
                    }
                if (key == "SensorSites") {
                    for (var feature of val.features) {
                        countForLoading++;
                        nessunRisultato = false;
                        addServiceToMap(feature, key);
                    }
                }
                if (key == "BusStops") {
                    for (var feature of val.features) {
                        countForLoading++;
                        nessunRisultato = false;
                        addServiceToMap(feature, key);
                    }
                }
            });
            if (nessunRisultato === true) {
                $('#loading').hide();
            }
            //            flyToEntitiesAndRemoveLoading();
        },
        error: function(jqxhr, textStatus, errorThrown) {
            window.alert(errorThrown + "\nErrore sul JSON, provare a ripetere la ricerca escludendo le fermate degli autobus (in TransferServiceAndRenting),\
                                        oppure effettuarla per \"area\".");
            $('#loading').hide();
        }
    });
}

function addServiceToMap(feature, key) {
    viewer.entities.add({
        id: feature.properties.id,
        name: feature.properties.name,
        type: key,
        position: Cesium.Cartesian3.fromDegrees(
            feature.geometry.coordinates[0],
            feature.geometry.coordinates[1]),
        point: {
            pixelSize: 5,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
        },
        billboard: {
            image: 'img/mapicons/' + feature.properties.serviceType + ".png",
            width: 24,
            height: 24
        },
        uri: feature.properties.serviceUri,
    });
    flyToEntitiesAndRemoveLoading();
}

function loadServiceDescription(service) {
    var serviceInfoURL = apiBase + 'v1/?serviceUri=' + service.uri + '&format=json';
    $.getJSON(serviceInfoURL, function(data) {
        var description = "<p>";
        $.each(data, function(key, val) {
            description += "Nome: " + val.features[0].properties.name + "<br>";
            description += "Tipo: " + val.features[0].properties.typeLabel + "<br>";
            description += "Telefono: " + val.features[0].properties.phone + "<br>";
            description += "Fax: " + val.features[0].properties.fax + "<br>";
            description += "Sito Web: " + val.features[0].properties.website + "<br>";
            description += "Provincia: " + val.features[0].properties.province + "<br>";
            description += "Città: " + val.features[0].properties.city + "<br>";
            description += "CAP: " + val.features[0].properties.cap + "<br>";
            description += "Indirizzo: " + val.features[0].properties.address + " " + val.features[0].properties.civic + "<br>";
            description += "E-mail: " + val.features[0].properties.email + "<br>";
            description += "Note: " + val.features[0].properties.note + "<br>";
        });
        description += "</p>";
        service.description = description;
    });
}

function loadBusStopDescription(busStop) {
    $.ajax({
        url: apiBase + 'v1/?serviceUri=' + busStop.uri + '&format=json',
        async: true,
        datatype: "json",
        success: function(data) {
            var description = "<p>";
            $.each(data, function(key, val) {
                if (key === "BusStop") {
                    description += "Nome fermata: " + val.features[0].properties.name + "<br>";
                    description += "Agenzia: " + val.features[0].properties.agency + "<br><br>";
                }
                if (key === "busLines") {
                    description += "Elenco linee: <br>";
                    $.each(val.results.bindings, function(k, v) {
                        description += v.busLine.value + ": " + v.lineDesc.value + "<br>";
                    });
                    description += "<br>";
                }
                if (key === "timetable") {
                    description += "Prossime partenze: <br>";
                    $.each(val.results.bindings, function(k, v) {
                        description += v.date.value + " " + v.departureTime.value + " : " + v.lineName.value + "<br>";
                    })
                }
            });
            description += "</p>";
            busStop.description = description;
        }
    });
}

function loadCarParkDescription(carPark) {
    $.ajax({
        url: apiBase + 'v1/?serviceUri=' + carPark.uri + '&format=json',
        async: true,
        datatype: "json",
        success: function(data) {
            var description = "<p>";
            var capacity = 0;
            var freeParkingLots = 0;
            var occupiedParkingLots = 0;
            var occupancy = 0;
            var status = "";
            var updating = "";
            $.each(data, function(key, val) {
                if (key == "Sensor") {
                    description += "Nome: " + val.features[0].properties.name + "<br>";
                    description += "Tipo: " + val.features[0].properties.typeLabel + "<br>";
                    description += "Indirizzo" + val.features[0].properties.address + "n° " + val.features[0].properties.civic + "<br>";
                    description += "Città: " + val.features[0].properties.city + " " + val.features[0].properties.cap + "<br>";
                    description += "Provincia: " + val.features[0].properties.province + "<br><br><br>";
                }
                if (key == "realtime") {
                    try {
                        capacity = val.results.bindings[0].capacity.value;
                        freeParkingLots = val.results.bindings[0].freeParkingLots.value;
                        occupiedParkingLots = val.results.bindings[0].occupiedParkingLots.value;
                        occupancy = val.results.bindings[0].occupancy.value;
                        status = val.results.bindings[0].status.value;
                        updating = val.results.bindings[0].updating.value;
                    } catch (e) {}
                    description += "Capacità: " + capacity + "<br>" +
                        "Posti liberi: " + freeParkingLots + "<br>" +
                        "Posti occupati: " + occupiedParkingLots + "<br>" +
                        "Occupazione: " + occupancy + " %<br>" +
                        "Stato: " + status + "<br>" +
                        "<br>Ultimo update: " + updating + "<br>";
                }

            });
            description += "</p>";
            carPark.description = description;
        }
    });
}

function loadSensorSiteDescription(sensorSite) {
    $.ajax({
        url: apiBase + 'v1/?serviceUri=' + sensorSite.uri + '&format=json',
        async: false,
        datatype: "json",
        success: function(data) {
            var description = "<p>";
            var avgDistance = 1;
            var avgTime = 1;
            var occupancy = 1;
            var concentration = 1;
            var vehicleFlow = 1;
            var averageSpeed = 1;
            var thresholdPerc = 1;
            var speedPercentile = 1;
            var instantTime = 1;
            $.each(data, function(key, val) {
                if (key == "Sensor") {
                    description += "Nome: " + val.features[0].properties.name + "<br>";
                    description += "Tipo: " + val.features[0].properties.typeLabel + "<br>";
                    description += "Città: " + val.features[0].properties.municipality + "<br>";
                    description += "Indirizzo: " + val.features[0].properties.address + "<br>";
                }
                if (key == "realtime") {
                    try {
                        avgDistance = val.results.bindings[0].avgDistance.value;
                    } catch (e) {
                        avgDistance = "Non disponibile";
                    }
                    try {
                        avgTime = val.results.bindings[0].avgTime.value;
                    } catch (e) {
                        avgTime = "Non disponibile";
                    }
                    try {
                        occupancy = val.results.bindings[0].occupancy.value;
                    } catch (e) {
                        occupancy = "Non disponibile";
                    }
                    try {
                        concentration = val.results.bindings[0].concentration.value;
                    } catch (e) {
                        concentration = "Non disponibile";
                    }
                    try {
                        vehicleFlow = val.results.bindings[0].vehicleFlow.value;
                    } catch (e) {
                        vehicleFlow = "Non disponibile";
                    }
                    try {
                        averageSpeed = val.results.bindings[0].averageSpeed.value;
                    } catch (e) {
                        averageSpeed = "Non disponibile";
                    }
                    try {
                        thresholdPerc = val.results.bindings[0].thresholdPerc.value;
                    } catch (e) {
                        thresholdPerc = "Non disponibile";
                    }
                    try {
                        speedPercentile = val.results.bindings[0].speedPercentile.value;
                    } catch (e) {
                        speedPercentile = "Non disponibile";
                    }
                    try {
                        instantTime = val.results.bindings[0].instantTime.value;
                    } catch (e) {
                        instantTime = "Non disponibile";
                    }
                    description += "Avg Distance: " + avgDistance + " m" + "<br>";
                    description += "Avg Time: " + avgTime + " sec" + "<br>";
                    description += "Occupancy: " + occupancy + " %" + "<br>";
                    description += "Concentration: " + concentration + " car/km" + "<br>";
                    description += "Vehicle Flow: " + vehicleFlow + " car/h" + "<br>";
                    description += "Average Speed: " + averageSpeed + " km/h" + "<br>";
                    description += "ThresholdPerc: " + thresholdPerc + " %" + "<br>";
                    description += "Speed Percentile: " + speedPercentile + " %" + "<br>";
                    description += "<br> Latest Update: " + instantTime + "<br>";
                }
            });
            description += "</p>";
            sensorSite.description = description;
        }
    });
}

// GESTIONE 3D DATA

function getCategorie3D() {
    var categorie = [];
    var nCatAll = 0;
    $('#' + tipo_cat + ' .macrocategory:checked').each(function() {
        categorie.push($(this).val());
    });
    return categorie;
}

function getSelectedDatas(category) {
    var selectedDatas = [];
    $('#3d_data' + " .sub_" + category + ":checked").each(function() {
        selectedDatas.push($(this).val());
    });
    return selectedDatas;
}

var jsonURL = "";
var jsonRESULT = null; //conterrà la risposta delle api alla ricerca
var viewsJSON = null;
var sensorSitesInMap = false;
var carParkInMap = false;
var sensorSitesSelectedDatas = [];
var sensorSitesSelectedDataIndex = 0;
var carParkSelectedDatas = [];
var carParkSelectedDataIndex = 0;
var realtimeWorker = null;
var autoplay = false;

function manage3DDatas() {
    sensorSitesInMap = false;
    sensorSitesSelectedDatas = getSelectedDatas("SensorSite");
    sensorSitesSelectedDataIndex = 0;
    carParkInMap = false;
    carParkSelectedDatas = getSelectedDatas("Car_park");
    carParkSelectedDataIndex = 0;
    $.ajax({
        url: "views.json",
        async: false,
        datatype: "json",
        success: function(data) {
            viewsJSON = data;
        }
    });
    $.ajax({
        url: jsonURL,
        async: true,
        datatype: "json",
        success: function(data) {
            jsonRESULT = data;
            parseJSON3D();
        },
        error: function(){
            window.alert("Something went wrong.");
            $('#loading').hide();
        }
    });
}

function parseJSON3D() {
    $('#loading').show();
    nessunRisultato = true;
    viewer.entities.removeAll();
    countForLoading = 0;
    //PARSING DEL JSON E POSIZIONAMENTO PIN
    $.each(jsonRESULT, function(key, val) {
        if (key == "Services")
            for (var feature of val.features) {
                nessunRisultato = false;
                if (feature.properties.typeLabel === "Parcheggio auto") {
                    countForLoading++;
                    add3DEntityToMap(feature, feature.properties.typeLabel);
                    carParkInMap = true;
                } else {
                    countForLoading++;
                    addServiceToMap(feature, key);
                }
            }
        if (key == "SensorSites") {
            for (var feature of val.features) {
                countForLoading++;
                nessunRisultato = false;
                add3DEntityToMap(feature, key);
                sensorSitesInMap = true;
            }
        }
        if (key == "BusStops") {
            for (var feature of val.features) {
                countForLoading++;
                nessunRisultato = false;
                addServiceToMap(feature, key);
            }
        }
    });
    if (nessunRisultato === true) {
        $('#loading').hide();
    }
    //        flyToEntitiesAndRemoveLoading();
}

function add3DEntityToMap(feature, typeLabel) {
    var firstProperty = "";
    var secondProperty = undefined;
    if (typeLabel === "SensorSites") {
        firstProperty = sensorSitesSelectedDatas[(sensorSitesSelectedDataIndex) % sensorSitesSelectedDatas.length];
    } else if (typeLabel === "Parcheggio auto") {
        firstProperty = carParkSelectedDatas[(carParkSelectedDataIndex) % carParkSelectedDatas.length];
        secondProperty = "occupancy";
    }
    $.ajax({
        url: apiBase + 'v1/?serviceUri=' + feature.properties.serviceUri + '&format=json',
        async: true,
        datatype: "json",
        error: function() {
            flyToEntitiesAndRemoveLoading();
        },
        success: function(data) {
            var id = feature.properties.id;
            var name = feature.properties.name;
            var coords = [feature.geometry.coordinates[0],
                feature.geometry.coordinates[1]
            ];
            var uri = feature.properties.serviceUri;
            var template = null;
            $.each(viewsJSON[typeLabel], function(key, whatINeed) {
                if (key === firstProperty) {
                    template = whatINeed;
                }
            });
            var scala = $("#fattorescala").val();
            var datas;
            if (typeLabel === "SensorSites") {
                datas = getSensorSiteDatas(data);
            } else if (typeLabel === "Parcheggio auto") {
                datas = getParcheggioAutoDatas(data);
            }
            var newEntity = new Cesium.Entity();
            newEntity.id = id;
            newEntity.name = name;
            newEntity.coords = coords;
            newEntity.type = typeLabel;
            newEntity.uri = uri;
            newEntity.position = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], 0);
            newEntity.datas = datas;
            var geometry = new Object();
            $.each(template.properties, function(prop, value) {
                if (prop === template.dataInto) {
                    geometry[prop] = datas[firstProperty] * scala * template.scala;
                } else if (prop === "alpha") {
                    //do nothing
                } else if (prop === "coordinates") {
                    semidiag = template.thickness * scala;
                    geometry[prop] = Cesium.Rectangle.fromDegrees(coords[0] - semidiag, coords[1] - semidiag, coords[0] + semidiag, coords[1] + semidiag);
                } else if (prop === "rotation") {
                    geometry[prop] = Cesium.Math.toRadians(value);
                } else if (prop === "material") {
                    if (value.indexOf("#") == 0) {
                        var material = Cesium.Color.fromCssColorString(value);
                        var alphaToSet = template.properties.alpha;
                        if (secondProperty != undefined) {
                            var newAlpha = datas[secondProperty];
                            if (newAlpha >= 0 && newAlpha <= 1)
                                alphaToSet = newAlpha;
                        }
                        if (alphaToSet >= 0 && alphaToSet < 1)
                            material = material.withAlpha(alphaToSet)
                        geometry[prop] = material;
                    } else {
                        geometry[prop] = value;
                    }
                } else if (prop === "outline") {
                    if (value === "true")
                        geometry[prop] = true;
                    else
                        geometry[prop] = false;
                } else if (prop === "outlineColor") {
                    geometry[prop] = Cesium.Color.fromCssColorString(value);
                } else if (!isNaN(value)) {
                    geometry[prop] = value * scala;
                } else {
                    geometry[prop] = value;
                }
            });
            newEntity[template.type] = geometry;
            viewer.entities.add(newEntity);
            flyToEntitiesAndRemoveLoading();
        }
    })
}

function getSensorSiteDatas(data) {
    var avgDistance = 0;
    var avgTime = 0;
    var occupancy = 0;
    var concentration = 0;
    var vehicleFlow = 0;
    var averageSpeed = 0;
    var thresholdPerc = 0;
    var speedPercentile = 0;
    var instantTime = 0;
    $.each(data, function(key, val) {
        if (key == "realtime") {
            try {
                avgDistance = val.results.bindings[0].avgDistance.value;
            } catch (e) {
                avgDistance = 1;
            }
            try {
                avgTime = val.results.bindings[0].avgTime.value;
            } catch (e) {
                avgTime = 1;
            }
            try {
                occupancy = val.results.bindings[0].occupancy.value;
            } catch (e) {
                occupancy = 1;
            }
            try {
                concentration = val.results.bindings[0].concentration.value;
            } catch (e) {
                concentration = 1;
            }
            try {
                vehicleFlow = val.results.bindings[0].vehicleFlow.value;
            } catch (e) {
                vehicleFlow = 1;
            }
            try {
                averageSpeed = val.results.bindings[0].averageSpeed.value;
            } catch (e) {
                averageSpeed = 1;
            }
            try {
                thresholdPerc = val.results.bindings[0].thresholdPerc.value;
            } catch (e) {
                thresholdPerc = 1;
            }
            try {
                speedPercentile = val.results.bindings[0].speedPercentile.value;
            } catch (e) {
                speedPercentile = 1;
            }
            try {
                instantTime = val.results.bindings[0].instantTime.value;
            } catch (e) {
                instantTime = 1;
            }
        }
    });
    var datas = {
        avgDistance: avgDistance,
        avgTime: avgTime,
        occupancy: occupancy,
        concentration: concentration,
        vehicleFlow: vehicleFlow,
        averageSpeed: averageSpeed,
        thresholdPerc: thresholdPerc,
        speedPercentile: speedPercentile,
        instantTime: instantTime
    }
    return datas;
}

function getParcheggioAutoDatas(data) {
    var capacity = 0;
    var freeParkingLots = 0;
    var occupiedParkingLots = 0;
    var occupancy = 0;
    var status = "";
    var updating = "";
    $.each(data, function(key, val) {
        if (key == "realtime") {
            try {
                capacity = val.results.bindings[0].capacity.value;
                freeParkingLots = val.results.bindings[0].freeParkingLots.value;
                occupiedParkingLots = val.results.bindings[0].occupiedParkingLots.value;
                occupancy = occupiedParkingLots / capacity;
                status = val.results.bindings[0].status.value;
                updating = val.results.bindings[0].updating.value;
            } catch (e) {}
        }
    });
    var datas = {
        capacity: capacity,
        freeParkingLots: freeParkingLots,
        occupiedParkingLots: occupiedParkingLots,
        occupancy: occupancy,
        status: status,
        updating: updating
    };
    return datas;
}

function aggiorna3DEntities() {
    if (autoplay) {
        carParkSelectedDataIndex = (carParkSelectedDataIndex + 1) % carParkSelectedDatas.length;
        sensorSitesSelectedDataIndex = (sensorSitesSelectedDataIndex + 1) % sensorSitesSelectedDatas.length;
    }
    var carparkdata = carParkSelectedDatas[carParkSelectedDataIndex];
    var roadsensordata = sensorSitesSelectedDatas[sensorSitesSelectedDataIndex];
    var scala = $("#fattorescala").val();
    var oldEntities = viewer.entities;
    var newEntities = new Cesium.EntityCollection();
    var template = null;
    for (var oldEntity of oldEntities.values) {
        var newEntity = new Cesium.Entity();
        newEntity.id = oldEntity.id;
        newEntity.name = oldEntity.name;
        newEntity.coords = oldEntity.coords;
        newEntity.type = oldEntity.type;
        newEntity.uri = oldEntity.uri;
        newEntity.position = oldEntity.position;
        newEntity.datas = oldEntity.datas;
        var geometry = new Object();
        var firstProperty = undefined;
        var secondProperty = undefined;
        if (oldEntity.type === "Parcheggio auto") {
            $.each(viewsJSON[oldEntity.type], function(key, whatINeed) {
                if (key === carparkdata) {
                    template = whatINeed;
                }
            });
            firstProperty = carparkdata;
            secondProperty = "occupancy";
        } else if (oldEntity.type === "SensorSites") {
            $.each(viewsJSON[oldEntity.type], function(key, whatINeed) {
                if (key === roadsensordata) {
                    template = whatINeed;
                }
            });
            firstProperty = roadsensordata;
        }
        $.each(template.properties, function(prop, value) {
            if (prop === template.dataInto) {
                geometry[prop] = oldEntity.datas[firstProperty] * scala * template.scala;
            } else if (prop === "alpha") {
                //do nothing
            } else if (prop === "coordinates") {
                semidiag = template.thickness * scala;
                var coords = oldEntity.coords;
                geometry[prop] = Cesium.Rectangle.fromDegrees(coords[0] - semidiag, coords[1] - semidiag, coords[0] + semidiag, coords[1] + semidiag);
            } else if (prop === "rotation") {
                geometry[prop] = Cesium.Math.toRadians(value);
            } else if (prop === "material") {
                if (value.indexOf("#") == 0) {
                    var material = Cesium.Color.fromCssColorString(value);
                    var alphaToSet = template.properties.alpha;
                    if (secondProperty != undefined) {
                        var newAlpha = oldEntity.datas[secondProperty];
                        if (newAlpha >= 0 && newAlpha <= 1)
                            alphaToSet = newAlpha;
                    }
                    if (alphaToSet >= 0 && alphaToSet < 1)
                        material = material.withAlpha(alphaToSet)
                    geometry[prop] = material;
                } else {
                    geometry[prop] = value;
                }
            } else if (prop === "outline") {
                if (value === "true")
                    geometry[prop] = true;
                else
                    geometry[prop] = false;
            } else if (prop === "outlineColor") {
                geometry[prop] = Cesium.Color.fromCssColorString(value);
            } else if (!isNaN(value)) {
                geometry[prop] = value * scala;
            } else {
                geometry[prop] = value;
            }
        });
        newEntity[template.type] = geometry;
        newEntities.add(newEntity);
    }
    viewer.entities.removeAll();
    for (var entity of newEntities.values) {
        viewer.entities.add(entity);
    }
    gestisciLegenda();
}

function reloadDatasInBackground(entity) {
    $.ajax({
        url: apiBase + 'v1/?serviceUri=' + entity.uri + '&format=json',
        async: true,
        datatype: "json",
        success: function(data) {
            if (entity.type === "Parcheggio auto") {
                entity.datas = getParcheggioAutoDatas(data);
            } else if (entity.type === "SensorSites") {
                entity.datas = getSensorSiteDatas(data);
            }
        }
    });
}

function flyToEntitiesAndRemoveLoading() {
    countForLoading--;
    if (countForLoading <= 0) {
        $("#loading").hide();
        if (!autoplay) {
            viewer.flyTo(viewer.entities);
        }
        if (carParkInMap == true || sensorSitesInMap == true) {
            $('#fattorescala').show();
        }
        if (tipo_cat === "3d_data") { // && ( sensorSitesSelectedDatas.length>1 || carParkSelectedDatas.length>1)  ) {
            $('#autoplay_query').show();
            $('#legenda').show();
            gestisciLegenda();
        }
    }
}

//GESTIONE INTERFACCIA GRAFICA
$(document).ready(function() {
    // FUNZIONE PER MOSTRARE/NASCONDERE I MENU
    $(".header").click(function() {
        $header = $(this);
        //getting the next element
        $content = $header.next();
        //open up the content needed - toggle the slide- if visible, slide up, if not slidedown.
        $content.slideToggle(200, function() {
            //execute this after slideToggle is done
            //change text of header based on visibility of content div
            $header.text(function() {
                //change text based on condition
                return $content.is(":visible") ? "- Hide Menu" : "+ Show Menu";
            });
        });
    });
    // FUNZIONE PER MOSTRARE ELENCO COMUNI AL CAMBIO DELLA PROVINCIA
    $("#elencoprovince").change(function() {
        if ($("#elencoprovince").val() != null) {
            $.ajax({
                url: "municipalityList/" + $("#elencoprovince").val() + ".html",
                type: "GET",
                async: false,
                success: function(msg) {
                    $('#elencocomuni').html(msg);
                }
            });
        }
    });
    // FUNZIONE PER CAMBIO SELEZIONE ALLA SCELTA DI UN COMUNE
    $("#elencocomuni").change(function() {
        gpsActive = 0;
        var comuneChoice = $('#elencocomuni').val();
        selezione = "COMUNE di " + comuneChoice;
        $("#selezione").text(selezione);
        $('#raggioricerca option:contains("500 mt")').prop({
            selected: true
        });
    });
    $("#gpsSelect").click(function() {
        gpsActive = 1;
        if ($("#raggioricerca").val() === "area")
            $('#raggioricerca option:contains("500 mt")').prop({
                selected: true
            });
        viewer.canvas.addEventListener('click', function(e) {
            if (gpsActive == 1) {
                var mousePosition = new Cesium.Cartesian2(e.clientX, e.clientY);
                var ellipsoid = viewer.scene.globe.ellipsoid;
                var cartesian = viewer.camera.pickEllipsoid(mousePosition, ellipsoid);
                if (cartesian) {
                    var cartographic = ellipsoid.cartesianToCartographic(cartesian);
                    longitudeString = Cesium.Math.toDegrees(cartographic.longitude);
                    latitudeString = Cesium.Math.toDegrees(cartographic.latitude);
                    selezione = latitudeString + ";" + longitudeString;
                    mostraSelezione();
                    $("#selezione").text(selezione);
                    var locationLink = apiBase + "v1/location/?position=" + selezione + "&format=json";
                    $.getJSON(locationLink, function(data) {
                        var address = data.municipality + ", " + data.address + " " + data.number;
                        $('#approximativeAddress').text(address);
                    });
                } else {
                    window.alert('Globe was not picked');
                }
            }
        }, false);
    });
    // CAMBIO RAGGIO RICERCA
    $("#raggioricerca").change(function() {
        mostraSelezione();
    });
    // FUNZIONI PER CAMBIARE TAB
    $("#regular_tab").click(function() {
        $("#tabs-4").prop("style", "display:true");
        $("#tabs-5").prop("style", "display:none");
        $("#tabs-6").prop("style", "display:none");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "categorie";
    });
    $("#transversal_tab").click(function() {
        $("#tabs-5").prop("style", "display:true");
        $("#tabs-4").prop("style", "display:none");
        $("#tabs-6").prop("style", "display:none");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "categorie_t";
    });
    $("#3d_data_tab").click(function() {
        $("#tabs-6").prop("style", "display:true");
        $("#tabs-5").prop("style", "display:none");
        $("#tabs-4").prop("style", "display:none");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "3d_data";
    });
    // FUNZIONE PER MOSTRARE LE SOTTOCATEGORIE
    $(".toggle-subcategory").click(function() {
        $tsc = $(this);
        //getting the next element
        $content = $tsc.next();
        if (!$content.is(":visible")) {
            $('.subcategory-content').hide();
            $('.toggle-subcategory').html('+');
        }
        //open up the content needed - toggle the slide- if visible, slide up, if not slidedown.
        $content.slideToggle(200, function() {
            //execute this after slideToggle is done
            //change text of header based on visibility of content div
            $tsc.text(function() {
                //change text based on condition
                return $content.is(":visible") ? "-" : "+";
            });
        });
    });
    // SELEZIONA/DESELEZIONA TUTTE LE CATEGORIE - SOTTOCATEGORIE
    $('.macrocategory').change(function() {
        $cat = $(this).next().next().attr('class');
        $cat = $cat.replace(" macrocategory-label", "");
        if ($(this).prop('checked')) {
            $('.sub_' + $cat).prop('checked', 'checked');
        } else {
            $('.sub_' + $cat).prop('checked', false);
        }
    });
    // SELEZIONE/DESELEZIONE MACROCATEGORIA DA SOTTOCATEGORIA
    $('.subcategory').change(function() {
        $subcat = $(this).next().next().attr('class');
        $cat = $subcat.replace(" subcategory-label", "");
        if ($(this).prop('checked')) {
            $('.' + $cat + '.macrocategory-label').prev().prev().prop('checked', 'checked');
        } else {
            if (($('input.sub_' + $cat + '.subcategory:checked').length) == 0) {
                $('.' + $cat + '.macrocategory-label').prev().prev().prop('checked', false);
            }

        }
    });
    // SELECT/DESELECT ALL
    $('#macro-select-all').change(function() {
        if ($('#macro-select-all').prop('checked')) {
            $('#categorie .macrocategory').prop('checked', 'checked');
            $("#categorie .macrocategory").trigger("change");
        } else {
            $('#categorie .macrocategory').prop('checked', false);
            $("#categorie .macrocategory").trigger("change");
        }
    });
    // CHECKBOX SELECT/DESELECT ALL TRANSVERSAL
    $('#macro-select-all_t').change(function() {
        if ($('#macro-select-all_t').prop('checked')) {

            $('#categorie_t .macrocategory').not('#PublicTransportLine').prop('checked', 'checked');
            $("#categorie_t .macrocategory").not('#PublicTransportLine').trigger("change");
            if (!($('#PublicTransportLine').prop('disabled'))) {
                $('#PublicTransportLine').prop('checked', 'checked');
                $('#PublicTransportLine').trigger("change");
            }
            //$('#Sensor').prop('checked', 'checked');
            //$('#Bus').prop('checked', 'checked');
        } else {
            $('#categorie_t .macrocategory').prop('checked', false);
            $("#categorie_t .macrocategory").trigger("change");
            //$('#Sensor').prop('checked', false);
            //$('#Bus').prop('checked', false);
        }
    });
    //SCALA
    $('#fattorescala').change(function() {
        aggiorna3DEntities();
    });
    // AUTOPLAY
    $('#autoplay').click(function() {
        if($('#autoplay').val()==="stop"){
            playAutoplay();
        } else if ($('#autoplay').val()==="playing") {
            stopAutoplay();
        }
    });
    $('#goOnManually').click(function() {
        autoplay = true;
        aggiorna3DEntities();
        stopAutoplay();
    })
});

function playAutoplay(){
    realtimeWorker = new Worker("realtimeWorker.js");
    realtimeWorker.onmessage = function(e) {
        switch (e.data) {
            case "autoplay":
                aggiorna3DEntities();
                break;
            case "reload":
                for (var entity of viewer.entities.values) {
                    reloadDatasInBackground(entity);
                }
                break;
        }
    };
    realtimeWorker.postMessage([$('#secondicambiovista').val() * 1000, $('#minutiaggiornamento').val()]);
    var autoplayButton = document.getElementById("autoplay");
    autoplayButton.style.color = "red";
    $('#autoplay').text("Stop!");
    autoplayButton.value = "playing";
    autoplay = true;
    $('#legenda').show();
    gestisciLegenda();
}

function stopAutoplay(){
    if(realtimeWorker != null){
        realtimeWorker.terminate();
        realtimeWorker = null;
    }
    autoplay = false;
    var autoplayButton = document.getElementById("autoplay");
    autoplayButton.style.color = "black";
    $('#autoplay').text("Play!");
    autoplayButton.value = "stop";
}

function mostraSelezione() {
    viewer.entities.removeAll();
    if (gpsActive == 1 && $("#raggioricerca").val() != "area") {
        var raggio = $("#raggioricerca").val() * 1000;
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(longitudeString, latitudeString, 0),
            ellipse: {
                semiMinorAxis: raggio,
                semiMajorAxis: raggio,
                height: 0,
                material: Cesium.Color.RED.withAlpha(0.5)
            }
        });
    }
}

function pickEntity(windowPosition) {
    var picked = viewer.scene.pick(windowPosition);
    if (Cesium.defined(picked)) {
        var id = Cesium.defaultValue(picked.id, picked.primitive.id);
        if (id instanceof Cesium.Entity) {
            return id;
        }
    }
    return undefined;
};

function getAreaVisibile() {
    var ellipsoid = viewer.scene.globe.ellipsoid;
    var cl2 = new Cesium.Cartesian2(0, 0);
    var leftTop = viewer.scene.camera.pickEllipsoid(cl2, ellipsoid);
    cr2 = new Cesium.Cartesian2(viewer.scene.canvas.width, viewer.scene.canvas.height);
    var rightDown = viewer.scene.camera.pickEllipsoid(cr2, ellipsoid);
    if (leftTop != null && rightDown != null) {
        leftTop = ellipsoid.cartesianToCartographic(leftTop);
        rightDown = ellipsoid.cartesianToCartographic(rightDown);
        TLlong = leftTop.longitude * 180 / Math.PI;
        TLlat = leftTop.latitude * 180 / Math.PI;
        RDlong = rightDown.longitude * 180 / Math.PI;
        RDlat = rightDown.latitude * 180 / Math.PI;
        //        var area = [RDlat, TLlong, TLlat, RDlong];

        minLat = (RDlat <= TLlat) ? RDlat : TLlat;
        maxLat = (RDlat > TLlat) ? RDlat : TLlat;
        minLong = (RDlong <= TLlong) ? RDlong : TLlong;
        maxLong = (RDlong > TLlong) ? RDlong : TLlong;
        var area = [minLat, minLong, maxLat, maxLong];

        return area;
    } else {
        window.alert("Sky is visible.");
        return null;
    }
}

function gestisciLegenda() {
    var carparkdata = carParkSelectedDatas[carParkSelectedDataIndex];
    var roadsensordata = sensorSitesSelectedDatas[sensorSitesSelectedDataIndex];
    var template = null;
    if (carparkdata != undefined) {
        $.each(viewsJSON["Parcheggio auto"], function(key, whatINeed) {
            if (key === carparkdata) {
                template = whatINeed;
            }
        });
        var materialC = template.properties.material;
        var cC = document.getElementById("carParkCanvas");
        var ctxC = cC.getContext("2d");
        if (materialC.indexOf("#") == 0) {
            ctxC.fillStyle = materialC;
            ctxC.fillRect(0, 0, 30, 30);
        } else {
            var imgC = new Image();
            imgC.src = materialC;
            imgC.onload = function() {
                var patC = ctxC.createPattern(imgC, "no-repeat");
                ctxC.rect(0, 0, 30, 30);
                ctxC.fillStyle = patC;
                ctxC.fill();
            }
        }
        document.getElementById("carParkSpan").innerHTML = "Car park: " + carparkdata;
        $('#carParkCanvas').show();
    } else {
        document.getElementById("carParkSpan").innerHTML = "";
        $('#carParkCanvas').hide();
    }

    if (roadsensordata != undefined) {
        $.each(viewsJSON["SensorSites"], function(key, whatINeed) {
            if (key === roadsensordata) {
                template = whatINeed;
            }
        });
        var materialS = template.properties.material;
        var cS = document.getElementById("sensorSiteCanvas");
        var ctxS = cS.getContext("2d");
        if (materialS.indexOf("#") == 0) {
            ctxS.fillStyle = materialS;
            ctxS.fillRect(0, 0, 30, 30);
        } else {
            var imgS = new Image();
            imgS.src = materialS;
            imgS.onload = function() {
                var patS = ctxS.createPattern(imgS, "no-repeat");
                ctxS.rect(0, 0, 30, 30);
                ctxS.fillStyle = patS;
                ctxS.fill();
            }
        }
        document.getElementById("sensorSiteSpan").innerHTML = "Road sensor: " + roadsensordata;
        $('#sensorSiteCanvas').show();
    } else {
        document.getElementById("sensorSiteSpan").innerHTML = "";
        $('#sensorSiteCanvas').hide();
    }

}