document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const btnCalculate = document.getElementById('btn-calculate');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const resultContainer = document.getElementById('result-container');
    const cepInput = document.getElementById('cep-input');
    const bikeValueInput = document.getElementById('bike-value');
    const cityDisplay = document.getElementById('cidade-display');
    const ufDisplay = document.getElementById('uf-display');
    const volumeCards = document.querySelectorAll('.volume-card');
    const toggleButtons = document.querySelectorAll('.toggle-btn');

    // State
    let currentVolumeType = 'quadro';

    // --- MASKING & FORMATTING ---

    // CEP Mask (00000-000)
    cepInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) {
            val = val.slice(0, 5) + '-' + val.slice(5, 8);
        }
        e.target.value = val;

        // Auto-search simulation when 8 digits are reached
        if (val.replace('-', '').length === 8) {
            simulateCepSearch(val);
        }
    });

    // Money Formatting (Real R$)
    bikeValueInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        val = (val / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        e.target.value = val;
    });

    // --- TOGGLES & SELECTION ---

    // Handle Segmented Toggles (Tab switching)
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.parentElement;
            parent.querySelector('.active').classList.remove('active');
            btn.classList.add('active');
            
            // Visual feedback only for this demo
            console.log(`Switched to: ${btn.innerText}`);
        });
    });

    // Handle Volume Card Selection
    volumeCards.forEach(card => {
        card.addEventListener('click', () => {
            volumeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentVolumeType = card.dataset.type;
        });
    });

    // --- LOGIC SIMULATIONS ---

    function simulateCepSearch(cep) {
        // Show loading state in fields
        cityDisplay.value = 'Buscando...';
        ufDisplay.value = '...';
        
        // Mock delay 600ms
        setTimeout(() => {
            // Mock data for demo
            if (cep.startsWith('69')) {
                cityDisplay.value = 'BOA VISTA';
                ufDisplay.value = 'RR';
            } else if (cep.startsWith('01')) {
                cityDisplay.value = 'SÃO PAULO';
                ufDisplay.value = 'SP';
            } else {
                cityDisplay.value = 'CURITIBA';
                ufDisplay.value = 'PR';
            }
        }, 800);
    }

    // --- MAIN CALCULATION ACTION ---

    btnCalculate.addEventListener('click', async () => {
        // Validation
        if (!cepInput.value || !bikeValueInput.value) {
            alert('Por favor, preencha o CEP e o Valor da Bike para continuar.');
            return;
        }

        // 1. Loading State
        btnCalculate.disabled = true;
        const originalIcon = btnIcon.innerHTML;
        btnIcon.innerHTML = '<div class="spinner"></div>';
        btnText.innerText = 'CALCULANDO FRETE...';
        resultContainer.classList.add('hidden');

        // 2. Simulation Delay (1.2s)
        await new Promise(r => setTimeout(r, 1200));

        // 3. Mock Calculation Results
        const city = cityDisplay.value || 'BOA VISTA';
        const uf = ufDisplay.value || 'RR';
        const valRaw = parseFloat(bikeValueInput.value.replace('.', '').replace(',', '.'));
        
        // Mock business rules
        const baseFrete = (uf === 'RR') ? 1100 : 250;
        const gris = valRaw * 0.003; // 0.3%
        const subtotal = baseFrete + gris + 11.63 + 8.89;
        const totalSugerido = Math.ceil((subtotal + 30) / 5) * 5;

        // 4. Update Result UI
        document.getElementById('res-location').innerText = `${city} — ${uf}`;
        document.getElementById('res-prazo').innerText = (uf === 'RR') ? '25' : '8';
        document.getElementById('res-frete-peso').innerText = `R$ ${baseFrete.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-gris').innerText = `R$ ${gris.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-total').innerText = totalSugerido.toString();
        document.getElementById('res-subtotal').innerText = `Subtotal Real: R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        // 5. Finalize UI State
        btnCalculate.disabled = false;
        btnIcon.innerHTML = originalIcon;
        btnText.innerText = 'CALCULAR FRETE OFICIAL';
        resultContainer.classList.remove('hidden');

        // Smooth scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
