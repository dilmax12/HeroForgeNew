describe('MVP E2E', () => {
  it('cria herói, aparece na galeria e persiste após reload', () => {
    cy.visit('/create');

    // Preenche nome
    cy.contains('label', 'Nome').parent().find('input').type('Arthas');

    // Distribui pontos respeitando o total disponível (12 pontos)
    // Ajuste: 4 força, 4 destreza, 2 constituição, 2 inteligência = 12
    const inc = (attr: string, times: number) => {
      for (let i = 0; i < times; i++) {
        cy.contains('label', attr).parent().find('button').contains('+').click();
      }
    };
    inc('forca', 4);
    inc('destreza', 4);
    inc('constituicao', 2);
    inc('inteligencia', 2);

    // Valida pontos restantes 0
    cy.contains('Pontos restantes: 0');

    // Salva
    cy.contains('button', 'Forjar Herói').click();

    // Vai para a lista
    cy.visit('/');

    // Verifica que o herói aparece
    cy.contains('Seus Heróis');
    cy.contains('Arthas');

    // Recarrega e valida persistência
    cy.reload();
    cy.contains('Arthas');
  });
});
