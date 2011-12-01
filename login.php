<?php
$cname = "its-login-username";
if(! isset($_COOKIE[$cname])){?>
  <form action="https://php.radford.edu/~it-auth/vsp09/login.php" method="post">
    <input type="hidden" name="url" value="<?php echo $_SERVER['PHP_SELF'];?>">
    <input type="hidden" name="cname" value="<?php echo $cname;?>">
  </form>
  <script>document.forms[0].submit();</script>
<?php }else{?>
  <h2> Authenticated as <span id="user"><?php echo $_COOKIE[$cname];?></span></h2>
  <h4>Click 'Update Login' below to login to the ITS</h4> 
<?php }?>
