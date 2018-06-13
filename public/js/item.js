$('input[type=radio][name=star]').change(function() {
  let stars = $('#star_cover').children('label');
  console.log(stars);
  for (let i = 0; i < stars.length; i++) {
    if (i < this.value) {
      // checked
      $(stars[i]).find('span').addClass('fa-star star-checked');
      $(stars[i]).find('span').removeClass('fa-star-o');
    } else {
      $(stars[i]).find('span').removeClass('fa-star star-checked');
      $(stars[i]).find('span').addClass('fa-star-o');
    }
  }
});

$('.fixed-review').click(function() {
  let currentComment = $('#rating_text').val();
  if (currentComment.length + $(this).html().length <= 100 && currentComment.search($(this).html()) === -1) {
    console.log(1)
    $('#rating_text').val(currentComment + $(this).html() + ' ');
    recountWord();
  }

});

$('#rating_text').keydown(function(e) {
  if ($('#rating_text').val().length >= 100) {
    e.preventDefault();
  }
});

$('#rating_text').keyup(function() {
  recountWord();
});

function recountWord() {
  $('#word_count').html($('#rating_text').val().length);
}

$('#quantity').keydown(function(e) {
  if ((e.keyCode <= 48))
});