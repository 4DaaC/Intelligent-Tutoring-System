$(document).ready(function() {
  $.tablesorter.addParser({
    id: 'difficulty',
    is: function(s) {
      return false;
    },
    format: function(s){
      return s.toLowerCase().replace(/easy/,0).replace(/medium/,1).replace(/difficult/,2);
    },
  type: 'numeric'
  });
  $.tablesorter.addParser({
    id: 'attempts',
    is: function(s) {
      return false;
    },
    format: function(s){
      console.log(s);
      var test = s.replace(/^.+Close/,'').replace(/View Attempts$/,'');
      console.log(test);
      return test;
    },
  type: 'numeric'
  });
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
  $('.default-sort').tablesorter();
  $('#qform').submit(function() {
    $('textarea[name="ans"]').each(function(index, element){
      var text = $(element);
      text.next().val(text.val());
    });
  });
  $('#add').click(function() {
    $('#choices').append('<div class="input-prepend input-append"><span class="add-on"><input type="checkbox" name="correct"/></span><input type="text" name="ans" class="span8"/><button type="button" class="btn btn-danger del"><i class="icon-remove-sign"></i></button></div>');
  });
  $('#addno').click(function() {
    $('#choices').append('<div class="input-append"><input type="text" class="span8" name="correct"/><button type="button" class="btn btn-danger del"><i class="icon-remove-sign"></i></button></div>');
  });
  $('.del').live("click", function() {
    $(this).parent().empty().remove(); 
  });
  $('.rem').click(function() {
    if(confirm("Are you sure you want to delete this question?")) {
      $.ajax({
        url: "question",
        data: {questid: $(this).val()},
        type: "DELETE",
        success: function() {
          $(this).parent().empty().remove();
	  location.reload();
        }
      });
    }
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
