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
      var test = s.replace(/^.+Close/,'').replace(/View Attempts$/,'');
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
  $('#add').live('click',function() {
    $('#choices').append('<div class="input-prepend input-append"><span class="add-on"><input type="checkbox" name="correct"/></span><input type="text" name="ans" class="span3"/><button type="button" class="btn btn-danger del"><i class="icon-remove-sign"></i></button></div>');
  });
  $('#addno').live('click',function() {
    $('#choices').append('<div class="input-append"><input type="text" class="span3" name="correct"/><button type="button" class="btn btn-danger del"><i class="icon-remove-sign"></i></button></div>');
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
$('.close-modal').live('click',function(){
  $('#popup-modal').modal('hide');
});
function formModal(url){
  $.get(url,function(data){
    var modal = $('<div class="modal fade" id="popup-modal"><div class="modal-header"></div><div class="modal-body">Test Again</div><div class="modal-footer"><div class="btn-group right"><a href="#" class="btn close-modal">Close</a></div></div></div>');
    var form = $(data);
    var title = form.first();
    var submit = form.find('input[type=submit]');
    modal.children('.modal-body').html(data).find('.form-title').remove();
    modal.children('.modal-body').find('input[type=submit]').remove();
    modal.children('.modal-header').html(title);
    modal.children('.modal-footer').find('.btn-group').prepend(submit);
    modal.children('.modal-footer').find('input[type=submit]').click(function(){
      modal.find('form').submit();
    });
    modal.modal('show');
    modal.on('hidden',function(){
      modal.remove();
      });
  });
}
