export const initialProject = {
  id: 'novo-projeto',
  label: 'Novo Projeto',
  icon: 'project',
  source: 'project',
  expanded: true,
  children: [
    {
      id: 'projetos-locais',
      label: 'Projetos Locais',
      icon: 'folder',
    },
    {
      id: 'modulo-dia-noite',
      label: 'Módulo Dia/Noite',
      icon: 'day-night',
    },
    {
      id: 'atividades-globais',
      label: 'Atividades Globais',
      icon: 'folder',
    },
    {
      id: 'pavimento-1',
      label: 'Novo Pavimento',
      icon: 'pavimento',
      source: 'pavimento',
      children: [
        {
          id: 'sala-de-automacao',
          label: 'Sala de Automação',
          icon: 'ambientes',
        },
      ],
    },
  ],
}