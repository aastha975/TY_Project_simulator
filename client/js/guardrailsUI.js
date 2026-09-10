/**
 * Engineering Quality Guardrails UI Manager
 */

function renderGuardrails(guardrails) {
  const container = document.getElementById('guardrailsContainer');
  if (!container) return;

  if (!guardrails || !guardrails.hasWarnings || guardrails.warnings.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = guardrails.warnings.map(w => `
    <div class="guardrail-alert ${w.severity}">
      <i class="fa-solid ${w.severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
      <div>
        <strong>[${w.category}]:</strong> ${w.message}
      </div>
    </div>
  `).join('');
}

window.renderGuardrails = renderGuardrails;
