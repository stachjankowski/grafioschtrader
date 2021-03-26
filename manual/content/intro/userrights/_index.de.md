---
title: "Daten und Benutzerrechte"
date: 2021-03-14T22:54:47+01:00
draft: false
weight : 20
chapter: true
---
## Daten
In GT gibt es **private** und **geteilte Daten**. Bei den **geteilten Daten** wird anhand der **Benutzerrechte** die Sicht- und  Veränderbarkeit geregelt. Daten wie die "Portfolios" und "Transaktionen" sind **private Daten** und für andere Benutzer nicht zugänglich. Die Informationsklassen "Anlageklassen" und "Handelsplatz" sind beispielsweise **geteilte Daten** und für alle Benutzer sichtbar aber die **Autorisierung** des Benutzers bestimmt deren **Veränderbarkeit**.

### Private Daten
Konto, Transaktion usw. sind **private Daten** und können von anderen nicht gesehen oder verändert werden.

### Geteilte Daten
Bei den geteilten Daten bestimmen die **Zugriffsrechte** des Benutzers bzw. ob dieser der Besitzer der **Entität** über die **Veränderbarkeit** einer Entität.

#### Besitzer einer Entität
Der welche eine **Entität** einer **Informationsklasse** der geteilten Daten erfasst, wird automatisch zum **Besitzer** dieser. Er kann diese **Entität** unabhängig seiner **Benutzerrechte** bearbeiten. Auch die Benutzer der **Priviligierten- bzw. Administratoren-Gruppe** können uneingeschränkt diese **Entität** ändern, alle anderen Benutzer können über [Datenänderungswunsch](../../basedata/) eine Änderung vorschalgen.

## Benutzerrechte
Mit der vollständigen Registrierung eines Benutzers, wird dieser automatisch zum **Benutzer mit Limits** zugeordnet.

### Benutzer mit Limits
Benutzer mit Limit kann nur eine **bestimmte Anzahl** von **Entitäten** einer **Informationsklasse** bzw. seiner **geteilten Entitäten** pro Tag erstellen bzw. ändern. Dadurch wird verhindert, dass ein Benutzer einen grösseren willentlichen Schaden an den **geteilten Daten** herbei führen kann.

### Benutzer ohne Limits
Dieser Benutzer unterliegt keiner Einschränkung bezüglich dem Erstellen oder verändern seiner **geteilten Daten**.

### Privilegierter Benutzer
Dieser hat die gleichen Benutzerrechte wie Benutzer ohne Limits plus kann er auch die **geteilten Daten** aller Benutzer verändern. Das Bearbeiten des **Handelskalender global** ist dieser Gruppe nicht erlaubt.

### Administrator
Er kann alle **geteilten Daten** verändern. Zusätzlich vergibt dieser dieser die Benutzerrechte.