$(function () {
  const $form = $('#addReview');
  if (!$form.length) {
    return;
  }

  $form.on('submit', function (event) {
    const $name = $form.find('#name');
    const $rating = $form.find('#rating');
    const $review = $form.find('#review');
    const name = $name.val().trim();
    const ratingValue = $rating.val();
    const rating = Number(ratingValue);
    const review = $review.val().trim();
    const validRating = ratingValue !== null && ratingValue !== ''
      && Number.isInteger(rating) && rating >= 0 && rating <= 5;
    const $alert = $form.find('.alert.alert-danger');
    $alert.hide();

    if (!name || !validRating || !review) {
      event.preventDefault();
      if ($alert.length) {
        $alert.show();
      } else {
        $('<div>', {
          role: 'alert',
          class: 'alert alert-danger',
          text: 'All fields required, please try again'
        }).prependTo($form);
      }
      const $invalidField = !name ? $name : !validRating ? $rating : $review;
      $invalidField.trigger('focus');
    }
  });
});
