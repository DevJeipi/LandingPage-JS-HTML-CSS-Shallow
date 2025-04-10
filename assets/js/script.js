let countLeft = 1;
let countRight = 1;

document.getElementById("radio1-left").checked = true;
document.getElementById("radio1-right").checked = true;

setInterval( function(){
    nextImage('left');
}, 4000)

setInterval( function(){
    nextImage('right');
}, 4000)

function nextImage(side) {
    if (side === 'left') {
        countLeft++;
        if (countLeft > 4) {
            countLeft = 1;
        }
        document.getElementById("radio" + countLeft + "-left").checked = true;
    } else {
        countRight++;
        if (countRight > 4) {
            countRight = 1;
        }
        document.getElementById("radio" + countRight + "-right").checked = true;
    }
}
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.count');
    
    const startCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        let count = 0;
        const speed = 90; // Ajuste a velocidade da animação aqui
        
        const updateCount = () => {
            const increment = target / speed;
            if (count < target) {
                count = Math.ceil(count + increment);
                if (count > target) count = target;
                counter.textContent = count;
                requestAnimationFrame(updateCount);
            }
        };
        
        // Criar o observador de interseção com threshold de 1 (100%)
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && entries[0].intersectionRatio >= 1) {
                updateCount();
                observer.unobserve(counter);
            }
        }, {
            threshold: 1 // Define que queremos observar quando 100% do elemento estiver visível
        });
        
        // Começar a observar o elemento
        observer.observe(counter);
    };

    counters.forEach(startCounter);
});
