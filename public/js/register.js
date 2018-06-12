$('#name').val('Van Tho');
$('#email').val('cuvantho123@gmail.com');
$('#password').val('cuvantho');
$('#re_password').val('cuvantho');

$( document ).ready(function() {
  $('#register_form').submit(function(e) {
    let email = $('#email').val();
    let name = $('#name').val();
    let password = $('#password').val();
    let re_password = $('#re_password').val();
    let invalid = false;

    if (!/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(email)) {
      invalid = true;
      $('#register_form').addClass('invalid');
      $('#register_error').html('Email chua dung dinh dang!');
    } else if (!validLength(name, 5, 100)) {
      invalid = true;
      $('#register_form').addClass('invalid');
      $('#register_error').html('Tan tu 5 toi 100 ky tu');
    } else if (!/[^a-z0-9A-Z_ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]/.test(name)) {
      invalid = true;
      $('#register_form').addClass('invalid');
      $('#register_error').html('Ten khong duoc chua ky tu sac biet');
    } else if (!validLength(password, 5, 100)) {
      invalid = true;
      $('#register_form').addClass('invalid');
      $('#register_error').html('Mat khau phai co 5 100');
    } else if (re_password !== password) {
      invalid = true;
      $('#register_form').addClass('invalid');
      $('#register_error').html('Mat khau xac nhan chua chinh xac');
    }

    if (invalid) {
      e.preventDefault();
    }
  });
});

function validLength(input, min, max) {
  return input && input.length >= min && input.length <= max;
}