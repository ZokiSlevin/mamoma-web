// SLIDESHOW
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');

if (slides.length > 0) {
  slides[currentSlide].classList.add('active');

  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 4000); // promjena slike svakih 4 sekunde
}

// HAMBURGER MENU
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const nav = document.querySelector("nav");

  hamburger.addEventListener("click", () => {
    nav.classList.toggle("show");
  });
});
