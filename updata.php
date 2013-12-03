<?PHP
if (isset($_REQUEST["data"]))
    file_put_contents("data", base64_decode($_REQUEST["data"]));
else
    die("No data!");
?>
