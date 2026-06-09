## Implementação: Área de Atuação dos Sensores

### Sensores suportados
- AC-MOV-TETO
- EB-SMT
- EB-SMTv2

### Representação visual

Os sensores acima devem exibir sua área de detecção de movimento no projeto.

### Geometria

- Todos os sensores possuem ângulo de abertura de 100°.
- O sensor é instalado no teto e apontado perpendicularmente para o piso.
- A área de detecção deve ser calculada como a projeção no piso de um cone com abertura de 100°.
- O raio da projeção depende do pé-direito configurado para o ambiente.

Fórmula:

```text
raio = alturaTeto × tan(50°)
```

Onde:
- alturaTeto = pé-direito do ambiente
- 50° = metade do ângulo de abertura do sensor

### Renderização

A área de atuação deve ser desenhada como um círculo.

Estilo:
- Stroke: 4px
- Stroke color: #F5D59D
- Fill color: #F5D59D
- Fill opacity: mesma opacidade utilizada atualmente nos polígonos/ambientes

### Interseção com paredes

A área de detecção não pode atravessar paredes.

Regras:
- A projeção circular deve ser limitada pelos contornos do ambiente.
- Qualquer trecho do círculo que ultrapasse os limites do polígono deve ser removido.
- O resultado final deve ser a interseção entre:
  - a projeção circular do sensor
  - o polígono do ambiente

Em termos geométricos:

```text
áreaVisível = círculoSensor ∩ polígonoDoAmbiente
```

### Atualização dinâmica

A área projetada deve ser recalculada sempre que ocorrer:
- alteração do pé-direito;
- movimentação do sensor;
- edição do polígono do ambiente.