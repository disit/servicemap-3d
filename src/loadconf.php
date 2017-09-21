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
   
$nameConfig = $_REQUEST['nameConfig'];

include('connessione.php');
  
$con = mysqli_connect($nomehost,$nomeuser,$password,$databaseA);

$nameConfig = mysqli_real_escape_string($con, $nameConfig);

$sql = "SELECT * FROM config WHERE nameConfig = '$nameConfig'";

$result = mysqli_query($con, $sql);

if (mysqli_num_rows($result) > 0) {
    // output data of each row
    while($row = mysqli_fetch_assoc($result)) {
        echo $row["value"];
        echo $row["datas"];
        echo $row["orientation"];
        echo $row["selection"];
        echo $row["keywords"];
    }
} else {
    echo "0 results";
}
?>