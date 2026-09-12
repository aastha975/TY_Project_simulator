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
      <div class="guardrail-icon">
        <i class="fa-solid ${w.severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
      </div>
      <div class="guardrail-copy">
        <div class="guardrail-heading">
          <span class="guardrail-severity">${w.severity}</span>
          <strong>${w.category}</strong>
        </div>
        <div class="guardrail-message">${w.message}</div>
      </div>
    </div>
  `).join('');
}

window.renderGuardrails = renderGuardrails;
