const productsContainer = document.querySelector('.grid');

productsContainer.addEventListener('click', function (event) {
  if (!event.target.classList.contains('remove-btn')) {
    return;
  }

  const productCard = event.target.closest('article');
  deleteProduct(productCard);
});

const deleteProduct = productCard => {
  if (!productCard) {
    return;
  }

  let productId = productCard.querySelector('[name=productId]').value;
  let _csrf = productCard.querySelector('[name=_csrf]').value;

  if (!productId || !_csrf) {
    return;
  }

  fetch(`/admin/product/${productId}`, {
    method: 'DELETE',
    headers: {
      'csrf-token': _csrf,
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.success) {
        productCard.remove();
      }
    })
    .catch(error => {
      console.error('Fetch error:', error && error.message);
    });
};
