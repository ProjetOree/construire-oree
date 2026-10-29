---
title: "Quand les systèmes ne racontent pas la même commande"
description: "Une commande annulée, un colis encore à préparer et un remboursement en cours : comment relier les informations entre systèmes avant de construire Orée ?"
draft: false
publishedAt: "2026-10-29"
---

Une acheteuse commande une pièce en céramique. Le paiement est confirmé et l'artisan s'apprête à préparer le colis.

Puis la commande est annulée.

Sur le compte de l'acheteuse, elle apparaît comme « annulée ». Dans l'espace de l'artisan, elle est toujours « à préparer ». Du côté du paiement, le remboursement est « en cours ».

Ces trois statuts peuvent apparaître au même moment. Mais pour l'artisan, une question se pose immédiatement : doit-il encore préparer la pièce ?

Ce scénario est fictif. Orée n'a pas encore de marketplace développée ni de commandes réelles. Il illustre une difficulté que je voudrais anticiper avant de concevoir les premiers parcours.

## Un statut ne raconte qu'une partie de l'histoire

Annuler une commande et rembourser un paiement sont deux opérations distinctes.

L'annulation peut être enregistrée alors que le remboursement n'est pas terminé. L'information peut aussi mettre du temps à arriver d'un outil à l'autre. L'acheteuse, l'artisan et la personne chargée du support risquent alors de voir des situations différentes.

Un statut donne une indication sur le moment présent. Pour comprendre un problème, il faut parfois retrouver les étapes qui y ont conduit.

Quand l'annulation a-t-elle été demandée ? Quand a-t-elle été acceptée ? Le remboursement a-t-il été lancé, confirmé ou interrompu ? L'artisan a-t-il reçu l'information à temps ?

Ce sont des questions très concrètes. Sans réponse fiable, on peut demander à un créateur de préparer une commande annulée ou laisser un acheteur sans explication sur son remboursement.

## Les informations doivent pouvoir être reliées

En réfléchissant à Orée, je vois trois points à examiner.

**Retrouver les événements utiles.** Une commande ne devrait pas se résumer à son dernier statut. Certaines étapes doivent pouvoir être reconstituées pour comprendre ce qui s'est passé et résoudre un incident.

**Savoir d'où vient chaque information.** Le système de commandes et le prestataire de paiement ne suivent pas exactement la même chose. Il faut pouvoir distinguer une commande annulée d'un remboursement effectivement terminé.

**Repérer les écarts.** Si le paiement a évolué mais que la commande n'a pas été mise à jour, comment détecter le problème ? Qui peut intervenir, et sur quelles informations peut-il s'appuyer ?

Je ne prétends pas avoir déjà les réponses. Ces questions auront des conséquences sur les données à conserver, les échanges entre les outils et les informations présentées aux utilisateurs.

Elles concernent aussi le travail quotidien des personnes qui devront comprendre les incidents et y répondre.

## Ce que je veux clarifier avant de coder

Pour l'instant, Orée n'a retenu ni prestataire de paiement, ni architecture des commandes, ni procédure définitive de remboursement.

Je ne cherche pas à prévoir tous les cas particuliers. J'aimerais surtout éviter de découvrir, une fois la plateforme utilisée, qu'il est impossible de retrouver facilement le parcours d'une commande.

C'est pourquoi je souhaite confronter ces questions à des personnes qui ont déjà développé ou exploité des services transactionnels. Leur expérience peut aider à distinguer les précautions essentielles des complications inutiles.

**Si vous avez déjà dû résoudre un incident sur une marketplace, quelle information vous a le plus manqué pour comprendre ce qui s'était passé ?**

Un exemple concret, même bref, serait précieux pour la suite d'Orée.

Si vous souhaitez apporter votre expérience en architecture backend, paiements ou opérations, vous pouvez aussi [proposer votre expertise pour Orée](https://tally.so/r/685NbB).
