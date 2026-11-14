const listenMenus = document.querySelectorAll('.listen-menu');
for (const menu of listenMenus) {
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) menu.open = false;
  });
}
document.addEventListener('click', event => {
  for (const menu of listenMenus) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  for (const menu of listenMenus) {
    if (menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  }
});
