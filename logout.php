<?php
$cname = "its-login-username";
setcookie($cname,"",time() - 3600,"/", ".radford.edu",1);
?>
  <form action="https://php.radford.edu/~it-auth/vsp09/login.php" method="post">
    <input type="hidden" name="url" value="https://php.radford.edu/~mjrohr/its/login.php">
    <input type="hidden" name="cname" value="<?php echo $cname;?>">
  </form>
  <script>document.forms[0].submit();</script>
