// Variable: list ng projects sa carousel, dito mag-add or mag-edit
const projects = [
  { title: "Project One",   type: "Group",      desc: "Short description of the project." },
  { title: "Project Two",   type: "Individual", desc: "Short description of the project." },
  { title: "Project Three", type: "Group",      desc: "Short description of the project." },
  { title: "Project Four",  type: "Individual", desc: "Short description of the project." },
  { title: "Project Five",  type: "Group",      desc: "Short description of the project." }
];

const SLIDE_DELAY = 5000; // Variable: wait time (ms) bago mag auto-slide
const ANIM_TIME   = 600;  // Variable: tagal (ms) ng slide animation
const OFFSET      = 200;  // Variable: layo (px) ng galaw ng slides palabas ng edges

let current = 0;        // Variable: index ng project na nasa gitna ngayon
let timer = null;       // Variable: hawak ang auto-slide timer para ma-cancel or ma-restart
let animating = false;  // Variable: true habang may animation, para hindi mag-spam click

const carousel  = document.querySelector(".carousel");
const prevSlide = document.getElementById("slide-prev");
const mainSlide = document.getElementById("slide-main");
const nextSlide = document.getElementById("slide-next");
const dotsBox   = document.getElementById("dots");

// Function: pag lumagpas sa dulo, balik sa simula (and vice versa)
function wrap(i) {
  return (i + projects.length) % projects.length;
}

// Function: nilalagay ang tag, title, at description sa isang slide
function fill(el, project) {
  el.innerHTML =
    '<span class="tag">' + project.type + '</span>' +
    '<h3>' + project.title + '</h3>' +
    '<p>' + project.desc + '</p>';
}

// Function: ni-re-redraw ang 3 slides at dots base sa current project
function render() {
  fill(prevSlide, projects[wrap(current - 1)]);
  fill(mainSlide, projects[current]);
  fill(nextSlide, projects[wrap(current + 1)]);

  dotsBox.innerHTML = "";
  projects.forEach(function (_, i) {
    const dot = document.createElement("button");
    dot.className = "dot" + (i === current ? " active" : "");
    dot.setAttribute("aria-label", "Go to project " + (i + 1));
    dot.onclick = function () {
      if (i !== current) change(i, i > current ? 1 : -1);
    };
    dotsBox.appendChild(dot);
  });
}

// ---------- animation helpers ----------

// Function: kinukuha ang position at size ng element sa screen
function rect(el) {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

// Function: kinokopya ang position tapos inililipat pa-side ng dx pixels
function shift(r, dx) {
  return { left: r.left + dx, top: r.top, width: r.width, height: r.height };
}

// Function: ina-animate ang slide mula sa dating pwesto (from) papunta sa bagong pwesto
function flip(el, from, fromOpacity) {
  const to = el.getBoundingClientRect();
  if (!to.width) return; // hidden (side slides sa mobile)
  const start =
    "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) " +
    "scale(" + (from.width / to.width) + "," + (from.height / to.height) + ")";
  el.animate(
    [
      { transform: start, transformOrigin: "0 0", opacity: fromOpacity },
      { transform: "none", transformOrigin: "0 0" }
    ],
    { duration: ANIM_TIME, easing: "ease-in-out" }
  );
}

// Function: gumagawa ng temporary copy ng slide na aalis, slide palabas, tapos buburahin
function exitClone(html, cls, from, dx) {
  const c = carousel.getBoundingClientRect();
  const clone = document.createElement("div");
  clone.className = "slide " + cls;
  clone.innerHTML = html;
  clone.style.cssText =
    "position:absolute; pointer-events:none;" +
    "left:" + (from.left - c.left - carousel.clientLeft) + "px;" +
    "top:" + (from.top - c.top - carousel.clientTop) + "px;" +
    "width:" + from.width + "px; height:" + from.height + "px;";
  carousel.appendChild(clone);

  const anim = clone.animate(
    [
      { transform: "none" },
      { transform: "translateX(" + dx + "px)", opacity: 0 }
    ],
    { duration: ANIM_TIME, easing: "ease-in-out" }
  );
  anim.onfinish = function () { clone.remove(); };
}

// ---------- timer + navigation ----------

// Function: simula ng 5 sec countdown bago mag next slide
// Note: after lang ng animation natatawag to, kaya hindi nag-o-overlap
function startTimer() {
  clearTimeout(timer);
  timer = setTimeout(function () { go(1); }, SLIDE_DELAY);
}

// Function: main na nagpapalit ng project at nagpe-play ng animation
// dir: 1 = next, -1 = previous
function change(index, dir) {
  if (animating) return;
  clearTimeout(timer);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Save muna ang pwesto ng bawat slide BAGO magpalit
  const before = {
    prev: rect(prevSlide), main: rect(mainSlide), next: rect(nextSlide),
    prevHTML: prevSlide.innerHTML, mainHTML: mainSlide.innerHTML, nextHTML: nextSlide.innerHTML
  };

  // Mobile: walang side slides, kaya buong width ang lipat ng main slide
  const sidesHidden = before.prev.width === 0;
  let off = OFFSET;
  if (sidesHidden) {
    off = carousel.clientWidth;
    before.prev = shift(before.main, -off);
    before.next = shift(before.main, off);
  }

  current = wrap(index);
  render();

  // Kung reduced motion ang setting ng user, skip animation
  if (reduce) {
    startTimer();
    return;
  }

  animating = true;

  if (dir > 0) {
    // Next: next slide -> main, main -> prev, yung lumang prev aalis sa left
    flip(mainSlide, before.next, sidesHidden ? 1 : 0.55);
    flip(prevSlide, before.main, 1);
    flip(nextSlide, shift(before.next, off), 0);
    if (sidesHidden) exitClone(before.mainHTML, "main", before.main, -off);
    else exitClone(before.prevHTML, "side", before.prev, -off);
  } else {
    // Previous: prev slide -> main, main -> next, yung lumang next aalis sa right
    flip(mainSlide, before.prev, sidesHidden ? 1 : 0.55);
    flip(nextSlide, before.main, 1);
    flip(prevSlide, shift(before.prev, -off), 0);
    if (sidesHidden) exitClone(before.mainHTML, "main", before.main, off);
    else exitClone(before.nextHTML, "side", before.next, off);
  }

  // Pag tapos na ang animation, unlock tapos start ng 5 sec countdown
  setTimeout(function () {
    animating = false;
    startTimer();
  }, ANIM_TIME);
}

// Function: lipat ng 1 step (1 = next, -1 = previous)
function go(step) {
  change(current + step, step);
}

// ---------- controls ----------

// Event: arrow buttons at side slides para mag-move ang carousel
document.getElementById("prev").onclick = function () { go(-1); };
document.getElementById("next").onclick = function () { go(1); };
prevSlide.onclick = function () { go(-1); };
nextSlide.onclick = function () { go(1); };

// Event: left/right arrow keys ng keyboard
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") go(-1);
  if (e.key === "ArrowRight") go(1);
});

// Start: draw agad pag load ng page (walang animation) tapos start ng timer
render();
startTimer();

// Function: placeholder lang to kasi wala pa tayong ibang pages, burahin pag meron na or pwede din i keep just incase may other features na gusto idagdag
function comingSoon(e) {
  e.preventDefault();
  alert("Feature coming soon");
}

// Event: lahat ng may class na "soon" magpapakita ng coming soon alert
document.querySelectorAll(".soon").forEach(function (el) {
  el.addEventListener("click", comingSoon);
});

// Event: pati main project slide coming soon muna (wala pang project pages)
mainSlide.style.cursor = "pointer";
mainSlide.addEventListener("click", comingSoon);