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

const exploreMenu = [...document.querySelectorAll('.listen-menu')].find(
  menu => menu.querySelector('summary')?.textContent.trim() === 'Explore'
);
const exploreLinks = exploreMenu?.querySelector('.listen-options');
if (exploreLinks && !exploreLinks.querySelector('a[href="/self-care/"]')) {
  const selfCareLink = document.createElement('a');
  selfCareLink.href = '/self-care/';
  selfCareLink.textContent = 'Self-Care Cards';
  exploreLinks.append(selfCareLink);
}
