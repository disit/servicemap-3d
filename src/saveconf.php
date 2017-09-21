<?php 
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

include('connessione.php');
  
$conA = mysqli_connect($nomehost,$nomeuser,$password,$databaseA);
if(!$conA){
    echo 'could not connect to database';
    return;
}
      
$value = mysqli_real_escape_string($conA,$_REQUEST['value']);
$nameConfig = mysqli_real_escape_string($conA,$_REQUEST['nameConfig']);
$datas = mysqli_real_escape_string($conA,$_REQUEST['datas']);
$orientation = mysqli_real_escape_string($conA,$_REQUEST['orientation']);
$selection = mysqli_real_escape_string($conA,$_REQUEST['selection']);
$keywords = mysqli_real_escape_string($conA,$_REQUEST['keywords']);
$nameConfig1 = mysqli_real_escape_string($conA, $nameConfig);
$sql = "INSERT INTO config (value,nameConfig,datas,orientation,selection,keywords) VALUES ('$value','$nameConfig1','$datas','$orientation','$selection','$keywords')";
$confUrl = "http://" . $_SERVER['SERVER_NAME'] . dirname($_SERVER['REQUEST_URI']) . "/?c=" . $nameConfig;
if($conA->query($sql)===TRUE){
  echo "Configuration saved: <a href=\"$confUrl\" target=\"_blank\">$nameConfig</a>";
} else {
  echo "ERROR: configuration <a href=\"$confUrl\" target=\"_blank\">$nameConfig</a> already present.";    
}
$conA->close();
?>