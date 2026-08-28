// Contenu par défaut du scénario "Le Dossier Perdu".
// Utilisé uniquement par le bouton d'import de l'espace organisateur —
// tout reste ensuite modifiable normalement dans l'admin.

export const HISTOIRE_TEXTE = `Bienvenue à l'IUA, Classe X.

Ce matin, le Directeur du Département Administration des Affaires devait vous lire un message officiel de bienvenue. Problème : la veille au soir, un ancien étudiant facétieux a piraté le système et fragmenté ce message en 10 morceaux, cachés dans les 10 services de l'établissement.

Votre équipe représente un service. Pour récupérer votre fragment, vous devrez résoudre 10 énigmes — de vraies énigmes, pas des questions de cours. Chacune se répond par déduction, jamais par hasard.

Une fois votre fragment récupéré, rejoignez l'amphi. Quand les 10 équipes seront réunies, vous reconstituerez le message original.

Le compte à rebours démarre maintenant. Bonne chance.`;

export const FRAGMENTS_SEED = [
  "Bienvenue à l'IUA,",
  "Classe X,",
  "vous rejoignez aujourd'hui",
  "une grande famille",
  "où l'exigence",
  "et la solidarité",
  "construisent ensemble",
  "les administrateurs, managers",
  "et entrepreneurs",
  "de demain.",
];

export const TEAMS_SEED: { nom: string; salle: string; fragmentIndex: number }[] = [
  { nom: "Direction Générale", salle: "Amphi 3", fragmentIndex: 0 },
  { nom: "Logistique", salle: "Amphi 6", fragmentIndex: 1 },
  { nom: "Finances & Comptabilité", salle: "Amphi 4", fragmentIndex: 2 },
  { nom: "Partenariats & Stages", salle: "Amphi 7", fragmentIndex: 3 },
  { nom: "Bibliothèque & Documentation", salle: "Amphi 1", fragmentIndex: 4 },
  { nom: "Ressources Humaines", salle: "Amphi 9", fragmentIndex: 5 },
  { nom: "Relations Étudiantes", salle: "Amphi 10", fragmentIndex: 6 },
  { nom: "Communication et Marketing", salle: "Amphi 2", fragmentIndex: 7 },
  { nom: "Informatique & Systèmes", salle: "Amphi 5", fragmentIndex: 8 },
  { nom: "Qualité & Innovation", salle: "Amphi 8", fragmentIndex: 9 },
];

interface SeedQuestion {
  salle: string;
  ordre: number;
  texte: string;
  reponse: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

function s(
  salle: string,
  items: [string, string, string][] // [texte, reponse, feedbackCorrect]
): SeedQuestion[] {
  return items.map(([texte, reponse, feedbackCorrect], i) => ({
    salle,
    ordre: i + 1,
    texte,
    reponse,
    feedbackCorrect,
    feedbackIncorrect: "Ce n'est pas ça. Regardez l'énigme autrement.",
  }));
}

export const QUESTIONS_SEED: SeedQuestion[] = [
  ...s("Amphi 3", [
    ["Je n'ai ni trône ni couronne, pourtant nul ne bouge sans mon accord silencieux. On me sent partout, on ne me voit jamais. Qui suis-je ?", "l'autorité", "L'autorité ne crie pas. Elle se sent."],
    ["Je vois plus loin que les murs de cette pièce, je devine demain avant qu'il n'arrive. Sans corps ni yeux, je guide pourtant chaque pas de l'organisation. Qui suis-je ?", "la vision", "Voir loin, c'est déjà commencer à y aller."],
    ["Je suis le chemin tracé avant le premier pas, invisible sur la carte mais gravé dans chaque décision. On me change rarement, on me trahit jamais sans risque. Qui suis-je ?", "la stratégie", "Le chemin est tracé. Reste à le suivre."],
    ["Je nais dans le doute et meurs dans l'action. Une fois prise, je ne peux plus reculer, même si je me trompe. Qui suis-je ?", "la décision", "Il est trop tard pour hésiter, désormais."],
    ["Je suis l'échelle que personne ne voit mais que chacun gravit ou descend selon son rôle. Sans moi, l'ordre devient chaos. Qui suis-je ?", "la hiérarchie", "Chaque barreau a sa place."],
    ["Je suis l'art de donner sans perdre, de confier sans abandonner. Le chef qui m'ignore finit par tout porter seul. Qui suis-je ?", "la délégation", "Porter à plusieurs, c'est porter plus loin."],
    ["Nous sommes plusieurs voix réunies autour d'une même table, et de nos désaccords naît une décision commune. Qui sommes-nous ?", "le conseil", "Le désaccord bien mené accouche des meilleures décisions."],
    ["Je ne m'achète pas, je ne s'hérite pas toujours, mais on me reconnaît dès qu'on entre dans une pièce. On me suit sans même me connaître. Qui suis-je ?", "le leadership", "On vous a suivi. C'est bien ça, le leadership."],
    ["Je suis le miroir du mois passé, froid sur le papier mais lourd de sens pour qui sait me lire. Sans moi, la Direction navigue à l'aveugle. Qui suis-je ?", "le rapport", "Le passé éclaire toujours l'avenir, à qui sait le lire."],
    ["Je suis la raison pour laquelle ce service existe, la boussole qui explique pourquoi chaque décision est prise ici. Sans moi, la Direction ne serait qu'un bureau vide. Qui suis-je ?", "la mission", "Bravo, Direction Générale. Voici votre fragment : \"Bienvenue à l'IUA,\""],
  ]),
  ...s("Amphi 9", [
    ["Je te lie sans te menotter, je promets sans jurer, je me signe une fois mais je dure longtemps. Qui suis-je ?", "le contrat", "Signé. Il vous engage désormais tous les deux."],
    ["Je choisis un visage parmi cent, une voix parmi mille, en pariant sur un avenir que je ne connais pas encore. Qui suis-je ?", "le recrutement", "Un pari sur l'humain, jamais tout à fait sûr."],
    ["Je me construis lentement, brique après brique, et je m'effondre en un instant si l'on me trahit. Qui suis-je ?", "la confiance", "Longue à bâtir, rapide à briser."],
    ["Je n'ai pas de bouche, pourtant je fais parler les silences. Le bon manager me pratique plus qu'il ne parle. Qui suis-je ?", "l'écoute", "Entendre ne suffit pas. Il fallait écouter."],
    ["Je transforme l'ignorance en compétence, la peur en assurance, sans jamais changer ton visage. Qui suis-je ?", "la formation", "On ressort différent, sans avoir changé de nom."],
    ["Nous sommes différents, venus d'ailleurs et d'ici, et pourtant ensemble nous formons une seule équipe plus forte que chacun de nous. Qui sommes-nous ?", "la diversité", "La force n'est pas dans la ressemblance."],
    ["Je suis la flamme invisible qui pousse à se lever tôt un lundi matin. Sans moi, même le talent s'endort. Qui suis-je ?", "la motivation", "La flamme brûle encore. Bien joué."],
    ["Je ne me vois pas, je me sens, dans un couloir silencieux ou une salle de pause bruyante, quand chacun se sent à sa place. Qui suis-je ?", "la cohésion", "Ce qui unit une équipe ne se voit pas — mais se sent."],
    ["Je ne m'achète pas au marché, pourtant chaque entreprise sérieuse m'affiche sur ses murs. Je guide les choix quand personne ne regarde. Qui suis-je ?", "les valeurs", "Ce que l'on fait quand personne ne regarde vous définit."],
    ["Je suis ce que chaque service cherche à repérer, à former, puis à garder le plus longtemps possible. Sans moi, aucune organisation n'avance. Qui suis-je ?", "le talent", "Bravo, Ressources Humaines. Voici votre fragment : \"et la solidarité\""],
  ]),
  ...s("Amphi 4", [
    ["Je suis une promesse chiffrée avant que l'année ne commence, et un jugement sévère une fois qu'elle s'achève. Qui suis-je ?", "le budget", "La promesse a tenu — ou non. À vous de le savoir."],
    ["Je suis la photographie d'un instant : tout ce que tu possèdes d'un côté, tout ce que tu dois de l'autre. Je dois toujours être en équilibre. Qui suis-je ?", "le bilan", "L'instant est figé, et il doit tenir debout."],
    ["Je suis le sang qui coule dans les veines d'une entreprise. Sans moi, même la plus riche des sociétés peut s'arrêter de battre. Qui suis-je ?", "la trésorerie", "Riche sur le papier ne suffit pas — il faut que ça coule."],
    ["Je suis une graine plantée aujourd'hui pour une récolte qu'on espère demain, sans jamais être sûr qu'elle poussera. Qui suis-je ?", "l'investissement", "Le pari est fait. Reste à attendre la récolte."],
    ["Je suis une main tendue qui aide à avancer plus vite, mais qu'il faudra un jour rendre, avec un peu plus que ce qu'elle a donné. Qui suis-je ?", "la dette", "Rien n'est jamais tout à fait gratuit."],
    ["Je réponds à une seule question, toujours la même : ce que tu as semé valait-il ce que tu as récolté ? Qui suis-je ?", "la rentabilité", "La question, cruelle mais juste, trouve enfin sa réponse."],
    ["Je suis la loi silencieuse qui veut que rien ne se perde : chaque franc qui entre a sa trace, chaque franc qui sort aussi. Qui suis-je ?", "l'équilibre", "Rien ne se perd, tout se retrouve — sur une ligne."],
    ["Je suis ce que l'on accumule avant d'oser investir, la richesse qui dort en attendant de travailler. Qui suis-je ?", "le capital", "La richesse qui dort... vient de se réveiller."],
    ["Plus tu me laisses dormir, plus je grossis tout seul. Je suis la récompense de la patience, ou le prix de l'attente. Qui suis-je ?", "l'intérêt", "Le temps travaille, même quand vous dormez."],
    ["Je suis le dernier endroit où l'argent s'arrête avant de sortir, ou le premier où il arrive. Sans moi, aucune transaction n'est complète. Qui suis-je ?", "la caisse", "Bravo, Finances & Comptabilité. Voici votre fragment : \"vous rejoignez aujourd'hui\""],
  ]),
  ...s("Amphi 7", [
    ["Je suis un pont signé par trois mains, celle de l'école, celle de l'entreprise, et la tienne, avant que tu ne traverses vers le monde réel. Qui suis-je ?", "la convention de stage", "Le pont est signé. La traversée peut commencer."],
    ["Je suis fait de visages croisés, de cartes échangées, de mains serrées qui, un jour, peuvent t'ouvrir une porte fermée à tous les autres. Qui suis-je ?", "le réseau", "Une porte qui ne s'ouvre qu'à ceux qu'on connaît."],
    ["Je passe une fois, discrète, et ne repasse pas toujours deux fois. Celui qui hésite trop me voit filer vers quelqu'un d'autre. Qui suis-je ?", "l'opportunité", "Celle-ci, au moins, n'a pas filé."],
    ["Je marche à tes côtés sans marcher à ta place, je corrige sans humilier, je te laisse trébucher pour mieux te voir te relever. Qui suis-je ?", "le tuteur", "Il guide sans jamais faire à votre place."],
    ["Je suis le témoin écrit d'une aventure vécue ailleurs, que tu dois raconter sans mentir ni t'oublier toi-même. Qui suis-je ?", "le rapport de stage", "L'aventure, racontée sans mentir."],
    ["Nous sommes deux forces différentes, une école et une entreprise, qui acceptons de marcher un temps dans la même direction. Qui sommes-nous ?", "le partenariat", "Deux mondes, une direction commune."],
    ["Je suis le moment où la théorie apprise en classe rencontre pour la première fois la réalité d'un bureau. Qui suis-je ?", "le stage", "La théorie vient enfin de rencontrer le réel."],
    ["Nous sommes deux mains qui se serrent malgré des mondes différents, une école et une entreprise, pour offrir une chance à quelqu'un. Qui sommes-nous ?", "l'alliance", "Deux mains, une même chance offerte."],
    ["Je suis quelques lignes écrites par un autre sur toi, capables de t'ouvrir des portes que ton propre CV n'aurait jamais atteintes seul. Qui suis-je ?", "la recommandation", "Les mots d'un autre, plus forts parfois que les vôtres."],
    ["Je suis ce petit pas qui permet d'en faire un plus grand, la première expérience qui ouvre toutes les autres portes. Qui suis-je ?", "le tremplin", "Bravo, Partenariats & Stages. Voici votre fragment : \"une grande famille\""],
  ]),
  ...s("Amphi 1", [
    ["Je suis un code muet collé sur mon dos, seul indice pour te retrouver parmi des milliers d'autres qui me ressemblent. Qui suis-je ?", "la cote", "Le code muet a parlé."],
    ["Je règne ici sans un mot, respecté par tous ceux qui viennent chercher une réponse que personne ne prononce à voix haute. Qui suis-je ?", "le silence", "Le silence n'a jamais été aussi éloquent."],
    ["Je conserve ce que le temps voudrait effacer, des pages jaunies que peu consultent mais que personne n'ose jeter. Qui suis-je ?", "les archives", "Rien de ce qui a été écrit n'est vraiment perdu."],
    ["Je suis la trace discrète qui prouve que tes mots ne sont pas nés de rien, mais d'un savoir emprunté à un autre avant toi. Qui suis-je ?", "la référence", "Personne n'écrit vraiment seul."],
    ["Je suis la faute silencieuse de celui qui oublie de dire d'où vient une idée qui n'est pas la sienne. Qui suis-je ?", "le plagiat", "Nommer une source, c'est éviter cette faute."],
    ["Je suis plus vieille que tous les étudiants réunis dans cette salle, faite de pages plutôt que de neurones. Qui suis-je ?", "la mémoire", "Le savoir accumulé ne s'oublie jamais tout à fait."],
    ["Je te confie un trésor pour un temps limité, à condition que tu me le rendes avant que le sablier ne se vide. Qui suis-je ?", "l'emprunt", "Le sablier n'était pas encore vide."],
    ["Je peux tenir un monde entier entre deux couvertures, voyager sans bouger, et vieillir sans jamais mourir tout à fait. Qui suis-je ?", "le livre", "Un monde entier, refermé entre vos mains."],
    ["Je suis le chemin patient entre une question sans réponse et une étagère qui la cache quelque part. Qui suis-je ?", "la recherche", "La patience finit toujours par trouver l'étagère."],
    ["Je suis la seule richesse qui grandit quand on la partage au lieu de diminuer. Qui suis-je ?", "le savoir", "Bravo, Bibliothèque & Documentation. Voici votre fragment : \"où l'exigence\""],
  ]),
  ...s("Amphi 10", [
    ["Je suis le premier pas d'un inconnu dans un groupe qui deviendra sa famille, le moment où l'étranger devient l'un des vôtres. Qui suis-je ?", "l'intégration", "L'étranger d'hier est déjà l'un des vôtres."],
    ["Nous entrons ensemble par la même porte et nous en ressortons ensemble des années plus tard, marqués par les mêmes souvenirs. Qui sommes-nous ?", "la promotion", "Une même porte, un même chemin."],
    ["Je ne me vois pas, je me sens, dans un silence complice ou un cri collectif au même instant. Qui suis-je ?", "la cohésion", "Ce silence complice, c'est déjà la réponse."],
    ["Je nais dans les épreuves partagées, je grandis dans les fous rires, et je survis longtemps après la fin des cours. Qui suis-je ?", "l'esprit", "Ce qui naît dans l'épreuve dure bien après elle."],
    ["Je me répète chaque année sans qu'on me réécrive, transmise d'une classe à l'autre comme un secret de famille. Qui suis-je ?", "la tradition", "Le secret passe, intact, d'une génération à l'autre."],
    ["Je réunis en un lieu et un instant des dizaines de personnes qui, sans moi, ne se seraient peut-être jamais parlé. Qui suis-je ?", "l'événement", "Des inconnus, réunis, qui ne le sont plus."],
    ["Je suis ce sentiment discret qui fait dire 'nous' plutôt que 'je', même face à des inconnus qui partagent ton uniforme. Qui suis-je ?", "l'appartenance", "'Nous' plutôt que 'je' — tout est dit."],
    ["Je nais parfois d'un simple regard échangé en cours, je grandis dans les pauses et les fous rires, et je dure parfois bien après le diplôme. Qui suis-je ?", "l'amitié", "Certains liens survivent bien plus longtemps que les cours."],
    ["Je suis la main tendue à celui qui n'a pas compris le cours, le partage d'un repas ou d'une feuille de révision. Qui suis-je ?", "la solidarité", "Une main tendue vaut mille discours sur l'entraide."],
    ["Je suis ce que dix équipes retrouvent enfin quand elles se réunissent après s'être cherchées séparément. Qui suis-je ?", "l'unité", "Bravo, Relations Étudiantes. Voici votre fragment : \"construisent ensemble\""],
  ]),
  ...s("Amphi 2", [
    ["Je tiens en une poignée de mots, pourtant je dois rester dans toutes les mémoires après qu'on m'a entendu une seule fois. Qui suis-je ?", "le slogan", "Il reste en tête. C'est bien tout son but."],
    ["Je ne suis ni un lieu ni une personne précise, mais le portrait-robot de celui à qui l'on parle sans jamais le nommer. Qui suis-je ?", "la cible", "On lui parle sans jamais la voir."],
    ["Je suis un visage sans traits humains, reconnaissable entre mille, capable de dire un nom sans prononcer une lettre. Qui suis-je ?", "le logo", "Un dessin qui parle sans un mot."],
    ["Je suis ce que les gens pensent de toi quand tu n'es pas dans la pièce. Je me construis lentement et je me brise vite. Qui suis-je ?", "l'image de marque", "Ce qu'on dit de vous en votre absence, voilà ce qui compte vraiment."],
    ["Je transforme un produit en aventure et un client en héros. Sans moi, on vend des choses ; avec moi, on raconte des rêves. Qui suis-je ?", "le storytelling", "L'histoire vend mieux que l'objet."],
    ["Je nais d'une étincelle et me propage comme un feu qu'on ne maîtrise plus, sautant d'écran en écran sans demander la permission. Qui suis-je ?", "la viralité", "Le feu s'est propagé plus vite qu'on ne l'imaginait."],
    ["Je suis l'idée unique qu'on veut planter dans mille esprits différents, avec les mêmes mots à chaque fois. Qui suis-je ?", "le message clé", "Une seule idée, répétée mille fois, finit par s'imposer."],
    ["Je suis plus qu'un nom, plus qu'un logo : je suis la promesse que l'on tient à chaque fois qu'on m'utilise. Qui suis-je ?", "la marque", "La promesse est tenue."],
    ["Je ne me vois pas à l'œil nu, mais je me compte en regards arrêtés, en souvenirs laissés après le passage d'une campagne. Qui suis-je ?", "l'impact", "Ce qui reste après le bruit, voilà l'impact."],
    ["Je suis ce nom qu'on reconnaît sans effort, ce visage familier qui rassure avant même qu'on ait parlé. Qui suis-je ?", "la notoriété", "Bravo, Communication et Marketing. Voici votre fragment : \"les administrateurs, managers\""],
  ]),
  ...s("Amphi 5", [
    ["Je suis une porte que seul toi peux ouvrir, à condition de ne jamais m'oublier ni me confier à un inconnu. Qui suis-je ?", "le mot de passe", "La porte s'ouvre. Vous la connaissiez déjà, sans le savoir."],
    ["Je suis une toile invisible qui relie des machines à travers le monde, sans fil visible mais sans laquelle rien ne communique. Qui suis-je ?", "le réseau", "Rien ne se voit, et pourtant tout est relié."],
    ["Je suis la mémoire de secours qu'on espère ne jamais devoir utiliser, jusqu'au jour où tout le reste a disparu. Qui suis-je ?", "la sauvegarde", "Celui qui m'a prévue ne le regrette jamais."],
    ["Je me glisse sans invitation, je me multiplie en silence, et je ne révèle mes dégâts que lorsqu'il est déjà trop tard. Qui suis-je ?", "le virus", "Détecté à temps, pour une fois."],
    ["Je suis une suite de règles sans âme qui, pourtant, décide parfois plus vite et mieux qu'un humain. Qui suis-je ?", "l'algorithme", "Sans âme, mais redoutablement efficace."],
    ["Je suis le nouveau trésor que personne ne voit, mais que tout le monde cherche à voler ou à protéger. Qui suis-je ?", "les données", "Le trésor invisible vaut aujourd'hui plus que l'or."],
    ["Je transforme un message clair en un langage que seul celui qui possède la clé peut à nouveau comprendre. Qui suis-je ?", "le chiffrement", "Le secret reste secret — pour qui n'a pas la clé."],
    ["Je suis un langage secret que seules les machines comprennent vraiment, fait de symboles que les humains ont inventés. Qui suis-je ?", "le code", "Le langage secret, enfin déchiffré par un humain."],
    ["Je surviens toujours au pire moment, transformant en quelques secondes un système fiable en écran noir. Qui suis-je ?", "la panne", "L'écran noir n'aura pas eu raison de vous."],
    ["Je suis l'ensemble invisible qui fait fonctionner toutes les machines ensemble, et que l'on ne remarque vraiment que le jour où je tombe en panne. Qui suis-je ?", "le système", "Bravo, Informatique & Systèmes. Voici votre fragment : \"et entrepreneurs\""],
  ]),
  ...s("Amphi 6", [
    ["Je suis un fleuve invisible qui traverse entrepôts et routes, ne s'arrêtant jamais tout à fait, sous peine de tout paralyser. Qui suis-je ?", "le flux", "Le fleuve continue de couler."],
    ["Je suis faite de mille maillons que personne ne voit jamais tous en même temps, et pourtant si l'un casse, tout s'arrête. Qui suis-je ?", "la chaîne", "Un seul maillon faible suffit à tout arrêter — celui-ci a tenu."],
    ["Je dors dans l'ombre des entrepôts, ni trop abondant ni trop rare, car l'un me gaspille et l'autre m'épuise. Qui suis-je ?", "le stock", "L'équilibre est le seul état qui me convienne."],
    ["Je suis la preuve silencieuse qu'un voyage s'est bien terminé, signée par celui qui reçoit ce qu'un autre a envoyé. Qui suis-je ?", "le bon de livraison", "Le voyage est arrivé à bon port."],
    ["Je suis un ventre de béton qui avale des cartons par milliers et ne les rend qu'un par un, au bon moment. Qui suis-je ?", "l'entrepôt", "Rien ne sort avant l'heure."],
    ["Je trace un chemin avant le premier kilomètre, et pourtant je change parfois en pleine route quand la réalité me contredit. Qui suis-je ?", "l'itinéraire", "Le plan tenait — jusqu'à l'imprévu, ou pas."],
    ["Je suis promis avant d'être tenu, redouté quand il approche, et souvent la première victime des imprévus. Qui suis-je ?", "le délai", "Le délai, cette promesse fragile, a été compris."],
    ["Je relie un point de départ à un point d'arrivée, par la route, par les airs ou par la mer, sans jamais rester en place. Qui suis-je ?", "le transport", "Toujours en mouvement, jamais arrêté."],
    ["Je suis le silence brutal d'un rayon qui devrait être plein, la promesse brisée entre celui qui commande et celui qui attend. Qui suis-je ?", "la rupture", "Le silence du rayon vide, évité de justesse."],
    ["Je nais d'un besoin exprimé quelque part, et je termine mon voyage entre les mains de celui qui m'a demandée. Qui suis-je ?", "la commande", "Bravo, Logistique. Voici votre fragment : \"Classe X,\""],
  ]),
  ...s("Amphi 8", [
    ["Je ne s'arrête jamais, même quand tout semble déjà bon, car je crois qu'il existe toujours un geste de plus à perfectionner. Qui suis-je ?", "l'amélioration", "Il n'y a jamais de point final, seulement des progrès."],
    ["Je nais souvent d'une question que personne n'osait poser, et je transforme une habitude en quelque chose que personne n'avait imaginé. Qui suis-je ?", "l'innovation", "La question interdite était la bonne."],
    ["Je suis née de rien, dans un instant, et pourtant je peux changer un service entier si quelqu'un ose me formuler à voix haute. Qui suis-je ?", "l'idée", "Il suffisait de l'oser à voix haute."],
    ["Je regarde les meilleurs pour comprendre ce qui les rend meilleurs, sans jamais les copier tout à fait. Qui suis-je ?", "le benchmarking", "Observer sans copier — tout l'art est là."],
    ["Je suis une règle invisible que personne ne voit quand elle est respectée, mais que tout le monde remarque quand elle est brisée. Qui suis-je ?", "la norme", "Invisible, jusqu'au jour où elle manque."],
    ["Je suis la petite fissure qu'on préfère trouver avant le client plutôt qu'après. Plus tôt on me découvre, moins je coûte cher. Qui suis-je ?", "le défaut", "Trouvée à temps, la fissure ne coûtera presque rien."],
    ["Je suis une idée devenue presque réelle, encore fragile, testée avant d'oser affronter le monde entier. Qui suis-je ?", "le prototype", "Presque réel — c'est déjà énorme."],
    ["Je suis la capacité à voir ce qui n'existe pas encore, à combiner ce que personne n'avait pensé à combiner. Qui suis-je ?", "la créativité", "Voir ce qui n'existe pas encore — c'est déjà l'inventer."],
    ["Je ne se décrète pas, je me mesure, dans un sourire, une note laissée après usage, ou un silence qui en dit long. Qui suis-je ?", "la satisfaction", "Ce sourire-là ne ment jamais."],
    ["Je suis la preuve que rien n'est jamais vraiment fini, que demain peut toujours être un peu meilleur qu'aujourd'hui. Qui suis-je ?", "le progrès", "Bravo, Qualité & Innovation. Vous détenez le dernier fragment : \"de demain.\""],
  ]),
];
