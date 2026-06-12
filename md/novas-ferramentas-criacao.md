# Implementação das Ferramentas da Toolbar

## Contexto

Atualmente, na toolbar, temos duas ferramentas de criação que estão funcionando: **Polígono** e **Retângulo**. Vamos implementar as duas ferramentas que faltam — **Elipse** e **Triângulo** — e aprimorar a ferramenta de **Retângulo**.

---

## Retângulo (aprimoramento)

Após definir o primeiro ponto:

- **Shift** → O retângulo cresce proporcionalmente (quadrado) na direção em que o mouse está se movendo.
- **Alt** → O retângulo cresce a partir do ponto inicial, expandindo para todas as direções. O **centro do retângulo** é o primeiro ponto definido.
- **Shift + Alt** → O retângulo cresce proporcionalmente (quadrado) a partir do ponto inicial. O **centro do quadrado** é o primeiro ponto definido.

---

## Elipse (anteriormente chamada de Círculo)

> **Atenção:** Renomear de "Círculo" para **"Elipse"** em todos os lugares da interface e do código.

A elipse é definida clicando em um ponto, movendo o mouse e clicando em outro ponto.

Após definir o primeiro ponto:

- **Shift** → A elipse cresce proporcionalmente (círculo) na direção em que o mouse está se movendo.
- **Alt** → A elipse cresce a partir do ponto inicial, expandindo para todas as direções. O **centro da elipse** é o primeiro ponto definido.
- **Shift + Alt** → A elipse cresce proporcionalmente (círculo) a partir do ponto inicial. O **centro do círculo** é o primeiro ponto definido.

> A elipse gerada se comporta exatamente como um polígono/ambiente.

---

## Triângulo

O triângulo é formado a partir da definição do primeiro ponto. Imagine um retângulo sendo desenhado: a **base do retângulo** é a mesma base do triângulo, e o **vértice do topo** do triângulo fica no **centro da linha superior** desse retângulo imaginário.

Após definir o primeiro ponto:

- **Shift** → O triângulo cresce proporcionalmente (equilátero) na direção em que o mouse está se movendo.
- **Alt** → O triângulo cresce a partir do ponto inicial, expandindo para todas as direções. O **centro do triângulo** é o primeiro ponto definido.
- **Shift + Alt** → O triângulo cresce proporcionalmente (equilátero) a partir do ponto inicial. O **centro do triângulo equilátero** é o primeiro ponto definido.

> O triângulo gerado se comporta exatamente como um polígono/ambiente.
