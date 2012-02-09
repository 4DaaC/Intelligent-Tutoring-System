$(document).ready(function() {
  $('#cb').click(clear);
  $('#submit').click(function() {
    $.ajax({
      url: "question",
      data: $('form').serialize(),
      type: "POST",
      success: function() {
        $(".new").detach();
        location.reload();
      }
    });
  });
  $('#qform').submit(function() {
    $('textarea[name="ans"]').each(function(index, element){
      var text = $(element);
      text.next().val(text.val());
    });
  });
  $('#add').click(function() {
    $('#choices').append('<li><textarea name="ans"></textarea><input type="checkbox" name="correct"/></li>')
  });
});

function add_question() {
  var full;
  if($('#type').val() == 'tf') {
    full = 'True/False';
  }
  if($('#type').val() == 'short') {
    full = 'Short Answer';
  }
  if($('#type').val() == 'multi') {
    full = 'Multiple Choice';
  }
  var newrow = $('<tr class="new"><td><input type="hidden" value="'+$('#type').val()+'" name="type"/>'+full+'</td><td><input type="text" name="quest"/></td><td></td><td><input type="text" name="correct"/></td></tr>');
  
  $("#qtable").append(newrow);
}

function clear() {
  if(confirm("Are you sure you wish to cancel?")) 
    $(".new").detach();
}
