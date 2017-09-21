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
   
var check = " ";
var lastSelection = " ";
var lastKeywords = " ";
var value = [];
var count1 = 0;
function controlloTutte() {
  lastKeywords = " ";
  check = " ";
  count1 = 0;
  value = [];
  $("input").each(function () {
    var isChecked = $(this).is(":checked");
    if (isChecked) {
      value[count1] = $(this).val();
      count1 = count1 + 1;
    }
  });

  lastSelection = " , " + selezione;

  if ($('#serviceTextFilter').val() != "") {
    lastKeywords = " , " + $('#serviceTextFilter').val();
  } else
    lastKeywords = " , no";
}

function statoRicerca() {
  if (value.length == 0) {
    alert("nessuna ricerca effettuta");
    return;
  }
  $("option").each(function () {
    var isChecked = $(this).is(":checked");
    if (isChecked) {
      value[count1] = $(this).parent().attr("id") + "-" + $(this).val();
      count1 = count1 + 1;
    }
  });
  for (var i = 0; i < count1; i = i + 1) {
    check += value[i] + " , ";
  }
  check += tab + " , ";

  var nameConfig = " ";
  nameConfig = prompt("Inserisci il nuome della configurazione : ");
  if (!(nameConfig == null || nameConfig == "")) {
    //confirm( " questi sono i valori scelti per la tua configurazione : " + check + "\n"
    //	   + " questo il nome della configurazione : " + nameConfig + " Tab: " + tab);
    datas = getPosition();
    datas.toString();
    orientation = getOrientation();
    $.ajax({
      type: "POST",
      url: "saveconf.php",
      data: "value=" + check + "&nameConfig=" + nameConfig + "&datas=" + datas + "&orientation=" + orientation + "&selection=" + lastSelection + "&keywords=" + lastKeywords,
      dataType: "html",
      success: function (response) {
        $("#saveResult").html(response);
      }, error: function () {
        alert("Chiamata fallita, si prega di riprovare...");
      }
    });
  }
}

function setConfigurazione(conf) {
  var nameConfig = "";
  if (!conf) {
    nameConfig = prompt("Inserisci nome della configurazione da caricare: ");
  } else {
    nameConfig = conf;
  }
  $.ajax({
    type: "POST",
    url: "loadconf.php",
    data: "nameConfig=" + nameConfig,
    dataType: "html",
    success: function (row) {
      var row = row.split(" , ");
      mapLoad();

      if (row == "0 results") {
        alert("configuration '" + nameConfig + "' NOT FOUND!");
        return;
      }

      datas = row[row.length - 4];
      var name_tab = row[row.length - 5];
      orientation = row[row.length - 3];
      if (name_tab == "3d_data_tab") {
        $("#tabs-6").prop("style", "display:true");
        $("#tabs-4").prop("style", "display:none");
        $("#tabs-5").prop("style", "display:none");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "3d_data";
        tab = "3d_data_tab";
      } else if (name_tab == "transversal_tab") {
        $("#tabs-5").prop("style", "display:true");
        $("#tabs-4").prop("style", "display:none");
        $("#tabs-6").prop("style", "display:none");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "categorie_t";
        tab = "transversal_tab";
      } else if (name_tab == "regular_tab") {
        $("#tabs-4").prop("style", "display:true");
        $("#tabs-5").prop("style", "display:none");
        $("#tabs-6").prop("style", "display:none");
        $("#regular_tab").prop("class", "ui-state-default ui-corner-top ui-tabs-active ui-state-active");
        $("#transversal_tab").prop("class", "ui-state-default ui-corner-top");
        $("#3d_data_tab").prop("class", "ui-state-default ui-corner-top");
        tipo_cat = "categorie";
        tab = "regular_tab";
      }

      $("#" + tipo_cat + " input").each(function () {
        if (row.indexOf($(this).val()) != -1 && $(this).val() != "") {
          $(this).attr("checked", true).trigger("change");
        }
      });

      $("select").each(function () {
        for (var i = 0; i < row.length; i++) {
          if (row[i].indexOf($(this).attr("id")) != -1 && $(this).attr("id") != "") {
            $(this).val(row[i].substring(row[i].indexOf("-") + 1)).trigger('change');
          }
        }
      });
      selezione = row[row.length - 2];
      keywords = row[row.length - 1];
      if (keywords != "no") {
        $('#serviceTextFilter').val(keywords);
      } else if (keywords == "no") {
        keywords = "";
      }

      loadPosition(datas, orientation);
      ricercaServizi();
      $("#menu-query .header").click();
      if (tab == "3d_data_tab") {
        playAutoplay();
      }
      count1 = 0;
      value = [];
    },
    error: function () {
      alert("Chiamata fallita, si prega di riprovare..."); //sempre meglio impostare una callback in caso di fallimento
    }
  });
}


function getPosition() {
  var camera = viewer.scene.camera;
  var currentCartesian = camera.position.clone();
  var newPos = new Cesium.Cartesian3();
  var currentCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(currentCartesian);
  return currentCartographic;
}

function getOrientation() {
  var camera = viewer.scene.camera;
  var heading = camera.heading;
  var pitch = camera.pitch;
  var roll = camera.roll;
  var orientation = " , " + heading + "," + pitch + "," + roll;
  return orientation;
}

function loadPosition(datas, orientation) {
  var longitude = datas.substring(1, datas.indexOf(","));
  var latitude = datas.substring(datas.indexOf(",") + 1, datas.lastIndexOf(","));
  var height = datas.substring(datas.lastIndexOf(",") + 1, datas.indexOf(")"));
  var orientation = orientation.split(",");
  var heading = parseFloat(orientation[0]);
  var pitch = parseFloat(orientation[1]);
  var roll = parseFloat(orientation[2]);

  var l = parseFloat(longitude);
  var la = parseFloat(latitude);
  var h = parseFloat(height);

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromRadians(l, la, h),
    orientation: {
      heading: heading,
      pitch: pitch,
      roll: roll
    }
  });
}