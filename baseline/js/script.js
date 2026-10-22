// BASELINE script: intentionally unoptimised (loaded synchronously in <head>, depends on jQuery)
$(document).ready(function () {
  $('.faq-question').click(function () {
    $(this).next('.faq-answer').slideToggle();
  });

  $('#submit').click(function () {
    if ($('#name').val() == '' || $('#email').val() == '') {
      alert('Please fill all fields');
      return;
    }
    if ($('#email').val().indexOf('@') == -1) {
      alert('Email is wrong');
      return;
    }
    alert('Thank you! Your card is ready to collect.');
  });
});
