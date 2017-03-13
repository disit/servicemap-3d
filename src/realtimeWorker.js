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
/* global self, resolve */

self.addEventListener('message',function(e){
    if ( e.data.length === 2 && !isNaN(e.data[0] && !isNaN(e.data[1]) ) ) { //!isNaN(e.data) ){
        var reloadTimer = e.data[1]*60*1000/e.data[0];
        var reloadTimerFIXED = reloadTimer;
        while(true){
            reloadTimer = reloadTimer - 1;
            sleep(e.data[0]);
            if(reloadTimer<=0){
                self.postMessage("reload");
                self.postMessage("autoplay");
                reloadTimer = reloadTimerFIXED;
            }else{
                self.postMessage("autoplay");
            }
        }
    } else {
        console.log("Errore di comunicazione con il realtimeWorker.");
    }
},false);

function sleep(milliseconds) {
  var start = Date.now();
  var end = start + milliseconds;
  while( Date.now() < end ){
      //do nothing
  }
}