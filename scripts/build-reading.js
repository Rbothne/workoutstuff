// Builds data/reading.json and docs/source-check.md from one source library and the article texts.
// Run: node scripts/build-reading.js
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const PAGE = 'page opened';
const API = 'PubMed record read through the NCBI E-utilities API (the PubMed web page blocks automated readers)';
const pm = (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`;

// key: [title, publisher, url, kind, country, how it was opened, what the source was found to say]
const S = {
  wender: ['The effect of chronic exercise on energy and fatigue states: a systematic review and meta-analysis of randomized trials', 'Frontiers in Psychology, 2022', 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.907637/full', 'journal', 'INT', PAGE, '81 trials, 7,050 people. Fatigue g = -0.374, energy g = 0.415, vitality g = 0.537.'],
  puetz: ['A randomized controlled trial of the effect of aerobic exercise training on feelings of energy and fatigue in sedentary young adults with persistent fatigue', 'Psychotherapy and Psychosomatics, 2008', 'https://karger.com/pps/article/77/3/167/282404/A-Randomized-Controlled-Trial-of-the-Effect-of', 'journal', 'US', PAGE, '36 adults, 6 weeks. Better fatigue outcome with low intensity; changes unrelated to fitness. The abstract gives no percentages, so the widely quoted 65% figure is not used.'],
  who: ['World Health Organization 2020 guidelines on physical activity and sedentary behaviour', 'World Health Organization, in British Journal of Sports Medicine, 2020', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/', 'authority', 'INT', PAGE, '150 to 300 min moderate or 75 to 150 min vigorous activity a week; regular muscle strengthening; some activity is better than none; reduce sedentary time.'],
  sit: ['Effect of frequent interruptions of prolonged sitting on self-perceived levels of energy, mood, food cravings and cognitive function', 'International Journal of Behavioral Nutrition and Physical Activity, 2016', pm(27809874), 'journal', 'US', API, 'Randomised crossover, 30 sedentary adults. Hourly 5-minute walks raised energy and vigor, improved mood, lowered fatigue and food cravings against 6 hours of sitting.'],
  aasm: ['Seven or more hours of sleep per night: a health necessity for adults', 'American Academy of Sleep Medicine and Sleep Research Society, 2015', 'https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/', 'authority', 'US', PAGE, 'Consensus of a 15-expert panel: adults should get seven or more hours of sleep a night.'],
  stadje: ['The differential diagnosis of tiredness: a systematic review', 'BMC Family Practice, 2016', pm(27765009), 'journal', 'INT', API, '26 studies. Anaemia 2.8%, malignancy 0.6%, serious somatic disease 4.3%, depression 18.5%.'],
  noetel: ['Effect of exercise for depression: systematic review and network meta-analysis of randomised controlled trials', 'The BMJ, 2024', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10870815/', 'journal', 'INT', PAGE, '218 studies, 14,170 people. Abstract states "Exercise is an effective treatment for depression." Walking or jogging g = -0.62; strength training g = -0.49. Confidence low for walking or jogging, very low for the rest.'],
  cdcsleep: ['Short sleep duration and sleep difficulties among adults: United States, 2024', 'US Centers for Disease Control and Prevention, National Center for Health Statistics, 2026', 'https://www.cdc.gov/nchs/products/databriefs/db559.htm', 'authority', 'US', PAGE, 'In 2024, 30.5% of adults slept less than 7 hours on average.'],
  alkhatib: ['The effects of partial sleep deprivation on energy balance: a systematic review and meta-analysis', 'European Journal of Clinical Nutrition, 2017', pm(27804960), 'journal', 'INT', API, '11 studies in the meta-analysis (172 people). Intake rose by 385 kcal (95% CI 252 to 517) with no significant change in energy expenditure.'],
  hall: ['Ultra-processed diets cause excess calorie intake and weight gain: an inpatient randomized controlled trial of ad libitum food intake', 'Cell Metabolism, 2019', pm(31105044), 'journal', 'US', API, '20 adults, 2 weeks on each diet. Meals were matched for presented calories, energy density, macronutrients, sugar, sodium and fiber. Intake was 508 kcal a day higher on the ultra-processed diet; +0.9 kg against -0.9 kg.'],
  hollands: ['Portion, package or tableware size for changing selection and consumption of food, alcohol and tobacco', 'Cochrane Database of Systematic Reviews, 2015', pm(26368271), 'journal', 'INT', API, '58 studies, 6,603 people. Larger sizes increased food eaten: SMD 0.38 overall, 0.46 in adults. Moderate-quality evidence.'],
  ello: ['Dietary energy density in the treatment of obesity: a year-long trial comparing 2 weight-loss diets', 'American Journal of Clinical Nutrition, 2007', pm(17556681), 'journal', 'US', API, '97 obese women. After a year, the group adding water-rich fruit and vegetables lost 7.9 kg against 6.4 kg and reported less hunger.'],
  johns: ['Diet or exercise interventions vs combined behavioral weight management programs: a systematic review and meta-analysis of direct comparisons', 'Journal of the Academy of Nutrition and Dietetics, 2014', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4180002/', 'journal', 'INT', PAGE, '8 trials, 1,022 people. Combined beat diet-only by 1.72 kg at 12 months and activity-only by 6.29 kg at 12 to 18 months.'],
  acsm: ['Appropriate physical activity intervention strategies for weight loss and prevention of weight regain for adults', 'American College of Sports Medicine position stand, 2009', pm(19127177), 'authority', 'US', API, '150 to 250 min a week prevents weight gain and gives only modest loss; more than 250 is associated with clinically significant loss. Observational studies indicate weight maintenance after loss is improved above 250 min, with no well-designed trials to confirm it. Resistance training does not enhance weight loss but may increase fat-free mass and increase loss of fat mass, and is associated with reductions in health risk.'],
  comp: ['Does increased exercise or physical activity alter ad-libitum daily energy intake or macronutrient composition in healthy adults? A systematic review', 'PLoS One, 2014', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3893086', 'journal', 'INT', PAGE, 'States that exercise alone produces less of an energy deficit than predicted, with compensation through eating and other activity offered as reasons. Qualitative; gives no percentage.'],
  wing: ['Long-term weight loss maintenance', 'American Journal of Clinical Nutrition, 2005', pm(16002825), 'journal', 'US', API, 'About 20% of overweight people lose at least 10% and keep it off a year. Registry members report about an hour of activity a day, regular breakfast, self-weighing and consistent eating across the week.'],
  anderson: ['Long-term weight-loss maintenance: a meta-analysis of US studies', 'American Journal of Clinical Nutrition, 2001', pm(11684524), 'journal', 'US', API, '29 studies. Five years after a structured programme the average person kept off 3 kg, about 3% of starting weight.'],
  cdcbmi: ['Adult BMI categories', 'US Centers for Disease Control and Prevention, 2024', 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', 'authority', 'US', PAGE, 'Under 18.5 underweight; 18.5 to less than 25 healthy weight; 25 to less than 30 overweight; 30 or greater obesity. BMI is a screening measure to be considered with other factors.'],
  cdclose: ['Steps for losing weight', 'US Centers for Disease Control and Prevention, 2025', 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html', 'authority', 'US', PAGE, 'People who lose about 1 to 2 pounds a week are more likely to keep it off. Even modest loss can improve blood pressure, cholesterol and blood sugar.'],
  wang: ['Specific metabolic rates of major organs and tissues across adulthood: evaluation by mechanistic model of resting energy expenditure', 'American Journal of Clinical Nutrition, 2010', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2980962', 'journal', 'US', PAGE, 'Resting rates in kcal per kg per day: liver 200, brain 240, heart 440, kidneys 440, skeletal muscle 13, adipose tissue 4.5. 131 adults.'],
  sardeli: ['Resistance training prevents muscle loss induced by caloric restriction in obese elderly individuals: a systematic review and meta-analysis', 'Nutrients, 2018', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5946208/', 'journal', 'INT', PAGE, '6 trials in obese older adults. Resistance training reduced 93.5% of the lean mass loss caused by caloric restriction.'],
  momma: ['Muscle-strengthening activities are associated with lower risk and mortality in major non-communicable diseases: a systematic review and meta-analysis of cohort studies', 'British Journal of Sports Medicine, 2022', pm(35228201), 'journal', 'INT', API, '16 cohort studies. 10 to 17% lower risk of death, cardiovascular disease, cancer and diabetes; largest reduction at about 30 to 60 minutes a week.'],
  behm: ['Minimalist training: is lower dosage or intensity resistance training effective to improve physical fitness? A narrative review', 'Sports Medicine, 2023', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10933173/', 'journal', 'INT', PAGE, 'One weekly session with fewer than 3 sets per multi-joint exercise at loads below 50% of maximum is enough for strength gains in beginners for at least the first 12 weeks.'],
  cdcact: ['Adult activity: an overview', 'US Centers for Disease Control and Prevention, 2023', 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html', 'authority', 'US', PAGE, 'Adults need at least 150 minutes of moderate activity a week and 2 days of muscle-strengthening activity.'],
  wycherley: ['Effects of energy-restricted high-protein, low-fat compared with standard-protein, low-fat diets: a meta-analysis of randomized controlled trials', 'American Journal of Clinical Nutrition, 2012', pm(23097268), 'journal', 'INT', API, '24 trials, 1,063 people. Higher protein: 0.79 kg more weight lost, 0.87 kg more fat lost, 0.43 kg more fat-free mass kept.'],
  singh: ['Time to form a habit: a systematic review and meta-analysis of health behaviour habit formation and its determinants', 'Healthcare, 2024', pm(39685110), 'journal', 'INT', API, '20 studies, 2,601 people, most at high risk of bias. In the four studies that timed it: medians 59 to 66 days, means 106 to 154 days, individuals 4 to 335 days.'],
  milkman: ['Megastudies improve the impact of applied behavioural science', 'Nature, 2021', pm(34880497), 'journal', 'US', API, '61,293 gym members, 54 four-week programmes. 45% raised weekly visits by 9 to 27%; the best offered small rewards for returning after a missed workout. Only 8% had a measurable effect afterwards.'],
  michie: ['Effective techniques in healthy eating and physical activity interventions: a meta-regression', 'Health Psychology, 2009', pm(19916637), 'journal', 'INT', API, '122 evaluations, 44,747 people. Self-monitoring plus another self-regulation technique: 0.42 against 0.26.'],
  teixeira: ['Exercise, physical activity, and self-determination theory: a systematic review', 'International Journal of Behavioral Nutrition and Physical Activity, 2012', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3441783/', 'journal', 'INT', PAGE, '66 studies. Consistent support for a positive relation between more autonomous forms of motivation and exercise.'],
  helander: ['Factors related to sustained use of a free mobile app for dietary self-monitoring with photography and peer feedback: retrospective cohort study', 'Journal of Medical Internet Research, 2014', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4004142', 'journal', 'INT', PAGE, 'Of 189,770 users, 2.58% used the app actively (at least 10 pictures over at least a week).'],
  rhodes: ['Can the affective response to exercise predict future motives and physical activity behavior? A systematic review of published evidence', 'Annals of Behavioral Medicine, 2015', pm(25921307), 'journal', 'INT', API, '24 studies. Feeling better during moderate exercise was linked to future activity; how people felt afterwards was not.'],
  weekend: ['Association of the "weekend warrior" and other leisure-time physical activity patterns with all-cause and cause-specific mortality', 'JAMA Internal Medicine, 2022', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9257680', 'journal', 'US', PAGE, '350,978 adults. Weekend warriors had similar mortality to the regularly active: hazard ratio 1.08 (0.97 to 1.20).'],
  paluch: ['Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts', 'The Lancet Public Health, 2022', pm(35247352), 'journal', 'INT', API, '47,471 adults. States that 10,000 steps a day is widely promoted but there is little evidence to support it. Risk falls with more steps until 6,000 to 8,000 a day at 60 and over, and 8,000 to 10,000 under 60. Quartile medians 3,553, 5,801, 7,842, 10,901; hazard ratios 0.60, 0.55, 0.47 against the lowest.'],
  laranjo: ['Do smartphone applications and activity trackers increase physical activity in adults? Systematic review, meta-analysis and metaregression', 'British Journal of Sports Medicine, 2021', pm(33355160), 'journal', 'INT', API, '28 trials, 7,454 people. Small to moderate effect (0.350), about 1,850 steps a day; text messages and personalisation helped.'],
  vbreview: ['Strategies for the prevention of volleyball related injuries', 'British Journal of Sports Medicine, 2006', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2564299', 'journal', 'INT', PAGE, 'Ankle sprains are the commonest acute injury, up to half of all injuries; up to 80% involve a previously injured ankle. Jumper\'s knee in about 40 to 50% of male indoor players. Shoulder pain 8 to 20% of injuries. Recommends balance-board training and landing technique.'],
  verhagen: ['The effect of a proprioceptive balance board training program for the prevention of ankle sprains: a prospective controlled trial', 'American Journal of Sports Medicine, 2004', pm(15310562), 'journal', 'NL', API, '116 volleyball teams (641 and 486 players). Fewer ankle sprains with balance-board training, significant only in players with a previous sprain. Overuse knee injuries rose in players with a history of knee injury.'],
  ankle: ['Preventive interventions for lateral ankle sprains: a systematic review and meta-analysis', 'Clinical Rehabilitation, 2023', pm(36630892), 'journal', 'INT', API, '17 studies. Proprioceptive training risk ratio 0.59, and 0.49 in people with a previous sprain. Bracing and proprioceptive training performed similarly.'],
  ankleov: ['Treatment and prevention of acute and recurrent ankle sprain: an overview of systematic reviews with meta-analysis', 'British Journal of Sports Medicine, 2017', pm(28053200), 'journal', 'INT', API, '46 reviews. Strong evidence for bracing and moderate evidence for neuromuscular training in preventing recurrence.'],
  plyo: ['Effects of plyometric jump training on vertical jump height of volleyball players: a systematic review with meta-analysis of randomized-controlled trial', 'Journal of Sports Science and Medicine, 2020', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7429440', 'journal', 'INT', PAGE, '14 studies, 322 players. Jump training improved vertical jump; the abstract gives a moderate effect (0.82) and the results section a larger one.'],
  quarmby: ['Risk factors and injury prevention strategies for overuse injuries in adult climbers: a systematic review', 'Frontiers in Sports and Active Living, 2023', 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1269870/full', 'journal', 'INT', PAGE, '34 studies, 10,049 climbers, low average quality. Risk rose with climbing intensity, bouldering, low grip or finger strength, crimp grip and previous injury. BMI and body weight were not associated with overuse injury.'],
  boulder: ['The art of falling: identifying the falls scenarios associated with bouldering injuries', 'Frontiers in Sports and Active Living, 2025', 'https://www.frontiersin.org/articles/10.3389/fspor.2025.1609133/full', 'journal', 'INT', PAGE, 'Survey of 245 climbers and 301 fall injuries. 67% affected the lower limb; ankle sprain was the commonest at 28%; 85% of the falls were involuntary.'],
  climbdet: ['Determinants for success in climbing: a systematic review', 'Journal of Exercise Science and Fitness, 2019', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6527913', 'journal', 'INT', PAGE, 'Hand and forearm strength and endurance are highly important; fingerboard training helped raise grades; low body fat and large forearm volume were traits of successful climbers.'],
  oja: ['Associations of specific types of sports and exercise with all-cause and cardiovascular-disease mortality: a cohort study of 80 306 British adults', 'British Journal of Sports Medicine, 2017', pm(27895075), 'journal', 'UK', API, 'Lower all-cause mortality with racquet sports (0.53), swimming (0.72), aerobics (0.73) and cycling (0.85); no significant association for running or football. Volleyball was not one of the six activities studied.'],
  whodiet: ['Healthy diet', 'World Health Organization fact sheet, 2026', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', 'authority', 'INT', PAGE, 'At least 400 g of fruit and vegetables and 25 g of fibre a day; free sugars below 10% of energy (about 50 g); total fat 30% or less; salt under 5 g.'],
  faojp: ['Food-based dietary guidelines: Japan', 'Food and Agriculture Organization of the United Nations, summarising the Japanese government guidelines', 'https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/japan/en/', 'authority', 'JP', PAGE, 'Ten messages including enjoying meals, regular hours, meals of staple, main and side dishes, enough grains, vegetables, fruit, dairy, beans and fish, less salt and fat. The Spinning Top puts grain dishes first, then vegetables, then fish, egg and meat, then milk and fruit, with water or tea and a runner for activity.'],
  mhlw: ['Nutrition policy in Japan: documents and links', 'Ministry of Health, Labour and Welfare, Japan', 'https://www.mhlw.go.jp/nutrition_policy/en/related', 'authority', 'JP', PAGE, 'Lists the Dietary Guidelines for Japanese as ten guidelines and the Japanese Food Guide Spinning Top as a guide sorting the daily diet into staple, side dish, main dish, dairy and fruit.'],
  faokr: ['Food-based dietary guidelines: Republic of Korea', 'Food and Agriculture Organization of the United Nations, summarising the General Dietary Guidelines for Koreans (2016)', 'https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/republic-of-korea/en/', 'authority', 'KR', PAGE, 'Nine messages: variety, do not skip breakfast, avoid overeating and move more, less salt, sugar and fat, plain water over sugary drinks, avoid alcohol, safe preparation, local produce, frequent family meals.'],
  cncdc: ['Eight key recommendations from Dietary Guidelines for Chinese Residents (2022)', 'Chinese Center for Disease Control and Prevention, 2022', 'https://en.chinacdc.cn/health_topics/nutrition_health/202206/t20220616_259702.html', 'authority', 'CN', PAGE, '12 foods a day and 25 a week; vegetables 300 to 500 g; fruit 200 to 350 g; milk 300 g; fish 300 to 500 g a week; salt under 5 g; added sugar under 50 g; water 1,500 to 1,700 ml; three regular meals; about 6,000 steps a day.'],
  faode: ['Food-based dietary guidelines: Germany', 'Food and Agriculture Organization of the United Nations, summarising the German Nutrition Society\'s "Eat and drink well" (2024)', 'https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/germany/en/', 'authority', 'DE', PAGE, 'Twelve messages: water as the main drink (about 1.5 litres), at least five portions of fruit and vegetables, legumes weekly, a small handful of nuts daily, whole grains, vegetable oils, dairy daily, fish once or twice a week, meat and sausage no more than 300 g a week, eat slowly and enjoy, stay active.'],
  kurotani: ['Quality of diet and mortality among Japanese men and women: Japan Public Health Center based prospective study', 'The BMJ, 2016', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4804125', 'journal', 'JP', PAGE, '79,594 adults followed a median of 15 years. Highest against lowest adherence to the Spinning Top: hazard ratio 0.85 (0.79 to 0.91) for total mortality.'],
  reynolds: ['Carbohydrate quality and human health: a series of systematic reviews and meta-analyses', 'The Lancet, 2019', pm(30638909), 'journal', 'INT', API, '185 prospective studies and 58 trials. Highest against lowest fibre eaters: 15 to 30% lower all-cause and cardiovascular mortality and incidence of coronary heart disease, stroke, type 2 diabetes and colorectal cancer; greatest benefit at 25 to 29 g a day. Certainty moderate for fibre.'],
  leidy: ['The role of protein in weight loss and maintenance', 'American Journal of Clinical Nutrition, 2015', pm(25926512), 'journal', 'INT', API, 'Review. Modest satiety effect from higher-protein meals; suggests 1.2 to 1.6 g per kg a day with at least 25 to 30 g per meal; longer-term studies are limited and conflicting.'],
};

const p = (text, cites = [], strength = null) => ({ text, cites, strength });
const g = (text, cites) => ({ text, cites });

const ARTICLES = [
  {
    id: 'eating', kind: 'topic', title: 'Eating well',
    sources: ['whodiet', 'faojp', 'mhlw', 'faokr', 'cncdc', 'faode', 'kurotani', 'reynolds', 'leidy', 'hollands', 'ello'],
    bluf: [
      g('Eat vegetables and fruit at most meals. Five portions, or about 400 g a day, is the common target.', ['whodiet', 'faode', 'cncdc']),
      g('Build a meal from a staple, a main and a side, mostly from plants, with fish once or twice a week.', ['faojp', 'faode', 'cncdc']),
      g('Make water or unsweetened tea your default drink.', ['faojp', 'faokr', 'faode']),
      g('Keep sweets, salty snacks and sugary drinks occasional, and serve them on a plate instead of eating from the package.', ['whodiet', 'faokr', 'hollands']),
      g('Eat regular meals, slowly, and with other people when you can.', ['faokr', 'faode', 'cncdc']),
    ],
    sections: [
      { heading: 'What the guidelines share', paragraphs: [
        p('Japan, South Korea, China, Germany and the World Health Organization all put plants at the centre. The WHO asks for at least 400 g of fruit and vegetables a day, Germany for at least five portions, and China for 300 to 500 g of vegetables plus 200 to 350 g of fruit.', ['whodiet', 'faode', 'cncdc'], 'guideline'),
        p('The WHO, China and Korea all limit salt, sugar and fat. The WHO and China both set salt under 5 g a day and added or free sugar under about 50 g, and Korea tells people to choose foods lower in salt, sugar and fat.', ['whodiet', 'cncdc', 'faokr'], 'guideline'),
        p('Water is the default drink everywhere: about 1.5 litres a day in Germany, 1,500 to 1,700 ml in China, plain water over sugary drinks in Korea, and water or tea in Japan.', ['faode', 'cncdc', 'faokr', 'faojp'], 'guideline'),
        p('Fish is in, and red and processed meat is limited. Germany suggests fish once or twice a week and no more than 300 g of meat and sausage a week. China suggests 300 to 500 g of fish a week. Japan asks for a mix of vegetables, beans and fish.', ['faode', 'cncdc', 'faojp'], 'guideline'),
        p('They also advise on how to eat, not only what. Korea says not to skip breakfast, to avoid overeating and to eat with family often. Germany says to eat slowly and enjoy it. Japan says to enjoy meals at regular hours, and China to keep three regular meals.', ['faokr', 'faode', 'faojp', 'cncdc'], 'guideline'),
      ] },
      { heading: 'Where they differ', paragraphs: [
        p('Japan builds the day on grain dishes such as rice, with vegetable dishes next and fish, egg and meat dishes after that. Its guide describes meals as a staple, a main and side dishes.', ['faojp', 'mhlw'], 'guideline'),
        p('Germany leans furthest toward plants, adding legumes at least weekly, a small handful of nuts daily and whole grains. China is the most specific on variety, asking for 12 different foods a day and 25 a week.', ['faode', 'cncdc'], 'guideline'),
        p('Every one of these food guides also includes physical activity. Japan draws a runner on top of its guide, and China names about 6,000 steps a day.', ['faojp', 'cncdc', 'faokr', 'faode'], 'guideline'),
      ] },
      { heading: 'What studies add', paragraphs: [
        p('In Japan, 79,594 adults were followed for about 15 years. Those who followed the national food guide most closely had a 15% lower death rate than those who followed it least. This is an observational study, so it shows a link and not a cause.', ['kurotani'], 'moderate'),
        p('Across 185 prospective studies and 58 trials, people who ate the most fibre had 15 to 30% lower rates of death, heart disease, stroke, type 2 diabetes and colorectal cancer than those who ate the least. The benefit was greatest at 25 to 29 g a day.', ['reynolds'], 'strong'),
        p('People eat more when the portion, package or plate is larger. A Cochrane review of 58 studies found a small to moderate effect, stronger in adults.', ['hollands'], 'strong'),
        p('In a year-long trial of 97 women, the group told to add water-rich fruit and vegetables lost more weight than the group told only to cut fat, and reported less hunger.', ['ello'], 'moderate'),
        p('Higher-protein meals are modestly more filling. One review suggests 1.2 to 1.6 g of protein per kg of body weight a day, with 25 to 30 g at a meal, and notes that long-term results are mixed.', ['leidy'], 'weak'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('The guideline targets describe a healthy pattern over weeks: at least 400 g of fruit and vegetables and 25 g of fibre a day, and under 5 g of salt. Nobody is expected to hit them at every meal.', ['whodiet'], 'guideline'),
        p('A country\'s good health has many causes besides its food: healthcare, income, how much people walk, smoking and drinking. These guidelines show what several health authorities agree on. They do not prove that diet alone explains why people in those countries live long.'),
      ] },
    ],
  },
  {
    id: 'energy', kind: 'topic', title: 'Energy and tiredness',
    sources: ['wender', 'puetz', 'who', 'sit', 'aasm', 'stadje', 'noetel', 'cdcsleep'],
    bluf: [
      g('On a flat day, do ten easy minutes of movement instead of waiting to feel energetic first.', ['wender', 'puetz']),
      g('Break up long sitting with a few minutes of walking each hour.', ['sit', 'who']),
      g('Protect seven or more hours of sleep a night.', ['aasm']),
      g('If tiredness lasts for weeks despite sleep and movement, tell a doctor, and mention your mood.', ['stadje']),
    ],
    sections: [
      { heading: 'Movement produces energy', paragraphs: [
        p('Across 81 randomised trials with 7,050 people, regular exercise reduced feelings of fatigue and raised feelings of energy and vitality. The effects were small to moderate.', ['wender'], 'strong'),
        p('In a six-week trial of 36 sedentary young adults with persistent fatigue, low-intensity exercise gave the better result for fatigue, and the gains did not depend on getting fitter. The trial was small.', ['puetz'], 'weak'),
        p('In a trial of 30 sedentary adults, a five-minute walk every hour raised energy, improved mood and reduced fatigue and food cravings compared with six hours of unbroken sitting.', ['sit'], 'weak'),
        p('Exercise is also an effective treatment for depression, according to a review of 218 trials that rated its own confidence in the result as low. Walking or jogging and strength training both helped.', ['noetel'], 'moderate'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Feeling tired is common. In 2024, three in ten US adults slept less than seven hours a night, which is below what sleep specialists recommend.', ['cdcsleep', 'aasm'], 'moderate'),
        p('Tiredness is rarely a sign of serious illness. Among people who saw a family doctor for it, 4.3% had a serious physical disease and 2.8% had anaemia, while 18.5% had depression.', ['stadje'], 'strong'),
        p('The WHO guideline says some physical activity is better than none and that sitting time should be reduced.', ['who'], 'guideline'),
      ] },
    ],
  },
  {
    id: 'sleep-appetite', kind: 'topic', title: 'Sleep and appetite',
    sources: ['alkhatib', 'hall', 'hollands', 'aasm', 'cdcsleep', 'ello'],
    bluf: [
      g('Treat the day after a short night as a day you will be hungrier, and decide what you will eat in advance.', ['alkhatib']),
      g('Keep a steady wake time and aim for seven hours or more.', ['aasm']),
      g('Put evening snacks on a plate or in a bowl and put the package away.', ['hollands']),
      g('Make less-processed food the easy option at home, and fill up on fruit and vegetables first.', ['hall', 'ello']),
    ],
    sections: [
      { heading: 'Why you overeat', paragraphs: [
        p('After a short night people eat more. Pooled sleep-restriction experiments found about 385 kcal more eaten the next day, with no increase in energy burned.', ['alkhatib'], 'strong'),
        p('The kind of food matters. In a tightly controlled trial, 20 adults ate about 508 kcal a day more on an ultra-processed diet than on an unprocessed one, even though the meals offered were matched for calories, sugar, fat and fibre. They gained 0.9 kg in two weeks on one diet and lost 0.9 kg on the other.', ['hall'], 'moderate'),
        p('The container matters too. Larger portions, packages and plates lead people to eat more, according to a Cochrane review of 58 studies.', ['hollands'], 'strong'),
        p('Foods with a lot of water and fibre fill you up for less. In a year-long trial, women who added fruit and vegetables reported less hunger than women who only cut fat.', ['ello'], 'moderate'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Sleep specialists recommend seven or more hours a night for adults. Three in ten US adults get less.', ['aasm', 'cdcsleep'], 'guideline'),
        p('Eating more after a short night, or from a larger package, is what these experiments found on average. It is a common response to the situation, and the situation is the part you can change.', ['alkhatib', 'hollands'], 'strong'),
      ] },
    ],
  },
  {
    id: 'strength', kind: 'topic', title: 'Why muscle matters',
    sources: ['momma', 'who', 'cdcact', 'sardeli', 'behm', 'wang', 'acsm'],
    bluf: [
      g('Do some muscle-strengthening work twice a week. Thirty to sixty minutes in total is where the largest benefit was seen.', ['momma', 'cdcact']),
      g('If twice is too much, do one short session. Beginners still get stronger.', ['behm']),
      g('Lift for strength and long-term health, and do not expect it to burn many calories.', ['wang', 'acsm']),
      g('If you are losing weight, keep lifting so that you lose fat and keep muscle.', ['sardeli']),
    ],
    sections: [
      { heading: 'What strength work does', paragraphs: [
        p('Across 16 cohort studies, people who did muscle-strengthening activity had a 10 to 17% lower risk of early death, heart disease, cancer and diabetes. The largest reduction was at about 30 to 60 minutes a week. These are observational studies.', ['momma'], 'moderate'),
        p('During weight loss, resistance training prevented about 93% of the muscle loss that dieting alone caused. The six trials were in older adults with obesity, so the size of the effect may differ for younger people.', ['sardeli'], 'moderate'),
        p('Resistance training does not add to weight loss, but it may increase lean mass and fat loss and is associated with lower health risk.', ['acsm'], 'guideline'),
      ] },
      { heading: 'Muscle and resting calorie burn', paragraphs: [
        p('A kilogram of muscle at rest uses about 13 kcal a day. Fat uses about 4.5, while the liver and brain use 200 or more per kilogram. Adding two kilograms of muscle therefore adds roughly 26 kcal a day at rest, so the popular idea that muscle burns a lot of calories passively is overstated.', ['wang'], 'moderate'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('The guideline for adults is muscle-strengthening activity on two days a week, alongside 150 minutes of moderate activity.', ['cdcact', 'who'], 'guideline'),
        p('Beginners do not need much. One weekly session, with fewer than three sets per exercise and light loads, is enough to gain strength for at least the first 12 weeks. This comes from a narrative review, which is weaker evidence than a trial.', ['behm'], 'weak'),
      ] },
    ],
  },
  {
    id: 'weight', kind: 'topic', title: 'Body weight',
    sources: ['johns', 'acsm', 'comp', 'wing', 'anderson', 'cdcbmi', 'cdclose', 'wang'],
    bluf: [
      g('To lose weight, change eating first. Use exercise to keep the weight off and to feel better.', ['johns', 'acsm']),
      g('Expect slow change. One to two pounds a week is the pace most likely to last.', ['cdclose']),
      g('Choose changes you could still be doing a year from now.', ['wing', 'anderson']),
      g('Treat BMI as a rough screen, not a verdict on your health.', ['cdcbmi']),
    ],
    sections: [
      { heading: 'Diet, exercise and the scale', paragraphs: [
        p('In trials that compared them directly, programmes combining diet and activity beat activity-only programmes by about 6.3 kg after 12 to 18 months, and beat diet-only programmes by about 1.7 kg at 12 months. Most of the weight loss comes from the diet side.', ['johns'], 'strong'),
        p('The American College of Sports Medicine says 150 to 250 minutes of moderate activity a week prevents weight gain but produces only modest loss by itself, and that observational studies link more than 250 minutes to better weight maintenance, though no well-designed trial has tested it.', ['acsm'], 'guideline'),
        p('Exercise alone tends to produce a smaller energy deficit than the arithmetic predicts, partly because people eat a little more or move less for the rest of the day.', ['comp'], 'weak'),
        p('Extra muscle changes resting calorie burn only a little, because a kilogram of muscle uses about 13 kcal a day at rest.', ['wang'], 'moderate'),
      ] },
      { heading: 'Keeping it off', paragraphs: [
        p('About one in five people with overweight lose at least 10% of their weight and keep it off for a year. People in a US registry who have kept weight off for years report about an hour of activity a day, regular breakfast, weighing themselves, and eating the same way on weekends as on weekdays. They are a self-selected group, so these are habits they share and not proven causes.', ['wing'], 'weak'),
        p('Five years after a structured weight-loss programme, the average person had kept off about 3 kg.', ['anderson'], 'strong'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('For adults, a BMI of 18.5 to under 25 is classed as healthy weight, 25 to under 30 as overweight, and 30 or more as obesity. At 5 ft 9 in and 185 lb, BMI works out to about 27.3. The CDC calls BMI a screening measure to be considered with other factors.', ['cdcbmi'], 'guideline'),
        p('People who lose about one to two pounds a week are more likely to keep it off, and even modest loss can improve blood pressure, cholesterol and blood sugar.', ['cdclose'], 'guideline'),
        p('Regaining some weight is the usual outcome, as the five-year figure shows. It reflects how hard maintenance is for most people.', ['anderson'], 'strong'),
      ] },
    ],
  },
  {
    id: 'habits', kind: 'topic', title: 'Building habits',
    sources: ['singh', 'milkman', 'michie', 'teixeira', 'helander', 'rhodes', 'weekend'],
    bluf: [
      g('Give a new habit about two months before you judge whether it has stuck.', ['singh']),
      g('After a missed day, the only job is to do the next one.', ['milkman']),
      g('Track with one tap and look back once a week. Very few people keep up detailed logging.', ['michie', 'helander']),
      g('Choose activity that feels good while you are doing it.', ['rhodes', 'teixeira']),
    ],
    sections: [
      { heading: 'What helps', paragraphs: [
        p('In a field experiment with 61,293 gym members and 54 different programmes, the best performer offered a small reward for coming back after a missed workout. It raised weekly visits by 27%.', ['milkman'], 'strong'),
        p('Programmes that combined self-monitoring with another self-regulation step, such as setting a goal or reviewing progress, worked better than those that did not (an effect of 0.42 against 0.26 across 122 evaluations).', ['michie'], 'strong'),
        p('People who feel better during moderate exercise are more likely to be active later. How they feel after the session did not predict it.', ['rhodes'], 'moderate'),
        p('Across 66 studies, doing exercise for your own reasons, because you enjoy or value it, was consistently linked to exercising more.', ['teixeira'], 'moderate'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Habits take longer than the popular 21 days. In the studies that timed it, the middle person took 59 to 66 days, and individuals ranged from 4 to 335 days. Most of these studies were rated at high risk of bias.', ['singh'], 'moderate'),
        p('Most nudges fade. In the gym experiment, only 8% of programmes still had a measurable effect after they ended.', ['milkman'], 'strong'),
        p('Dropping a tracking app is the norm. In one food-photo app, 2.58% of about 190,000 users kept using it actively.', ['helander'], 'moderate'),
        p('People who fit their weekly activity into one or two days had similar death rates to people who spread it across the week, in a study of 350,978 adults.', ['weekend'], 'moderate'),
      ] },
    ],
  },
  {
    id: 'injury', kind: 'topic', title: 'Staying uninjured',
    sources: ['vbreview', 'verhagen', 'ankle', 'ankleov', 'quarmby', 'boulder', 'plyo'],
    bluf: [
      g('If you have ever sprained an ankle, do balance work every week.', ['verhagen', 'ankle']),
      g('Practise soft, quiet landings before you add more jumping.', ['vbreview', 'plyo']),
      g('When climbing, build up slowly and use an open hand where you can instead of a hard crimp.', ['quarmby']),
      g('Treat falling as a skill. Most bouldering fall injuries are to the legs and ankles.', ['boulder']),
    ],
    sections: [
      { heading: 'Ankles', paragraphs: [
        p('Ankle sprains are the commonest acute volleyball injury, and up to 80% happen to an ankle that was sprained before.', ['vbreview'], 'weak'),
        p('In a trial across 116 volleyball teams, balance-board training reduced ankle sprains, and the benefit was significant only for players who had sprained an ankle before. Players with a history of knee injury had more overuse knee problems on the programme.', ['verhagen'], 'moderate'),
        p('Pooled across 17 studies, balance training cut the risk of an ankle sprain by about 40%, and by about half in people with a previous sprain. Ankle braces performed about as well.', ['ankle'], 'strong'),
        p('For preventing a repeat sprain, an overview of 46 reviews found strong evidence for bracing and moderate evidence for balance and control training.', ['ankleov'], 'strong'),
      ] },
      { heading: 'Knees, jumping and fingers', paragraphs: [
        p('Volleyball injury reviews recommend landing technique and balance training as the main prevention measures.', ['vbreview'], 'weak'),
        p('Jump training does raise vertical jump in volleyball players, across 14 trials.', ['plyo'], 'strong'),
        p('In climbers, overuse injuries were more likely with higher climbing intensity, bouldering, weak fingers or grip, the crimp grip and a previous injury. Body weight and BMI were not linked to injury. The 34 studies were of low average quality.', ['quarmby'], 'moderate'),
        p('In a survey of 301 bouldering fall injuries, 67% were to the lower limb and the most common was an ankle sprain. In 85% of cases the fall was not intended.', ['boulder'], 'weak'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Sore knees are common in volleyball. Jumper\'s knee affects about 40 to 50% of male indoor players, and shoulder pain accounts for 8 to 20% of injuries.', ['vbreview'], 'weak'),
        p('A common rule of thumb, not taken from these sources: muscle soreness for a day or two after something new is expected, while pain inside a joint that is still there the next morning is a reason to back off and have it looked at.'),
      ] },
    ],
  },
  {
    id: 'volleyball', kind: 'sport', title: 'Volleyball',
    sources: ['who', 'oja', 'vbreview', 'verhagen', 'ankle', 'plyo'],
    bluf: [
      g('Count every volleyball night toward the 150 to 300 minutes of weekly activity the WHO recommends.', ['who']),
      g('Protect your ankles with weekly balance work, most of all if you have sprained one before.', ['verhagen', 'ankle']),
      g('For a higher jump, a small amount of jump training works. Keep it small, because volleyball is already a lot of jumping.', ['plyo', 'vbreview']),
      g('Take pain just below the kneecap seriously early. It is the sport\'s commonest overuse problem.', ['vbreview']),
    ],
    sections: [
      { heading: 'What it gives you', paragraphs: [
        p('Health data on volleyball itself is thin. A large study of specific sports followed 80,306 British adults across six activities, and volleyball was not one of them. It found lower death rates among people who played racquet sports, swam, did aerobics or cycled, and no clear link for running or football.', ['oja'], 'moderate'),
        p('What can be said is that volleyball counts as activity. The WHO guideline is 150 to 300 minutes of moderate or 75 to 150 minutes of vigorous activity a week, and three nights of play goes a long way toward it.', ['who'], 'guideline'),
      ] },
      { heading: 'Jumping higher', paragraphs: [
        p('Across 14 randomised trials with 322 volleyball players, jump training improved vertical jump height.', ['plyo'], 'strong'),
      ] },
      { heading: 'Staying on court', paragraphs: [
        p('Ankle sprains make up as much as half of volleyball injuries, and up to 80% involve an ankle that was sprained before. Balance-board training reduced them in a trial of 116 teams.', ['vbreview', 'verhagen'], 'moderate'),
        p('Across sports, balance training lowers ankle sprain risk by about 40%.', ['ankle'], 'strong'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Knee and shoulder complaints are part of the sport for many players. About 40 to 50% of male indoor players have had jumper\'s knee.', ['vbreview'], 'weak'),
      ] },
    ],
  },
  {
    id: 'climbing', kind: 'sport', title: 'Climbing',
    sources: ['quarmby', 'boulder', 'climbdet', 'who', 'momma', 'ankle'],
    bluf: [
      g('Start at the weight you are now. Body weight was not linked to climbing overuse injuries.', ['quarmby']),
      g('Climb easy routes often before you climb hard ones. Intensity and bouldering are where injury risk rises.', ['quarmby']),
      g('Use an open hand where you can and save hard crimping.', ['quarmby']),
      g('Climb down when you can, and keep your ankles strong for the falls you do not choose.', ['boulder', 'ankle']),
    ],
    sections: [
      { heading: 'What it gives you', paragraphs: [
        p('Muscle-strengthening activity in general is linked to a 10 to 17% lower risk of early death and major disease, and the WHO recommends it regularly for all adults. None of these studies looked at climbing itself.', ['momma', 'who'], 'moderate'),
        p('Climbing loads the pulling muscles and the grip, which volleyball does not train. This is a description of the sport, not a study finding.'),
        p('Success in climbing depends heavily on hand and forearm strength and endurance, which improve with training.', ['climbdet'], 'moderate'),
      ] },
      { heading: 'Where people get hurt', paragraphs: [
        p('Overuse injuries in climbers were linked to higher intensity, bouldering, weak grip or fingers, the crimp grip and previous injury. BMI and body weight were not linked. The studies were of low average quality.', ['quarmby'], 'moderate'),
        p('In bouldering, falls mostly injure the legs: 67% of fall injuries in one survey were to the lower limb, most often an ankle sprain, and 85% of the falls were unplanned.', ['boulder'], 'weak'),
        p('Balance training lowers ankle sprain risk by about 40% across sports, which matters for landing falls as much as for volleyball.', ['ankle'], 'strong'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Expect your forearms to tire first. Hand and forearm strength and endurance are what the research rates as highly important for climbing.', ['climbdet'], 'moderate'),
        p('Experienced climbers tend to be lean with large forearms. That describes people who have climbed for years. It is not an entry requirement.', ['climbdet'], 'weak'),
      ] },
    ],
  },
  {
    id: 'strength-training', kind: 'sport', title: 'Lifting',
    sources: ['cdcact', 'behm', 'weekend', 'wycherley', 'momma', 'acsm', 'sardeli'],
    bluf: [
      g('Two sessions a week meets the guideline.', ['cdcact']),
      g('Start small. Fewer than three sets per exercise is enough for the first 12 weeks.', ['behm']),
      g('Lift on whichever days work. Packing your activity into one or two days is as good for long-term health as spreading it out.', ['weekend']),
      g('While losing weight, keep lifting and eat protein at each meal to hold on to muscle.', ['sardeli', 'wycherley']),
    ],
    sections: [
      { heading: 'How little is enough', paragraphs: [
        p('For beginners, one weekly session with fewer than three sets per multi-joint exercise, at loads under half of your maximum, is enough to gain strength for at least the first 12 weeks. The source is a narrative review.', ['behm'], 'weak'),
        p('The largest reduction in risk of early death was seen at about 30 to 60 minutes of muscle-strengthening activity a week.', ['momma'], 'moderate'),
        p('People who fit their weekly activity into one or two days had similar death rates to people who spread it out.', ['weekend'], 'moderate'),
      ] },
      { heading: 'Lifting and weight loss', paragraphs: [
        p('Resistance training does not enhance weight loss, though it may increase lean mass and fat loss.', ['acsm'], 'guideline'),
        p('In older adults with obesity, lifting while dieting prevented about 93% of the muscle loss that dieting alone caused.', ['sardeli'], 'moderate'),
        p('In 24 weight-loss trials, higher-protein diets kept about 0.4 kg more lean mass and lost about 0.9 kg more fat than standard-protein diets.', ['wycherley'], 'strong'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('Adults are advised to do muscle-strengthening activity on two days a week.', ['cdcact'], 'guideline'),
        p('Light loads working at first is expected. The review above found beginners progress on loads below 50% of their maximum.', ['behm'], 'weak'),
      ] },
    ],
  },
  {
    id: 'walking', kind: 'sport', title: 'Walking',
    sources: ['paluch', 'who', 'laranjo', 'sit', 'noetel'],
    bluf: [
      g('Aim for more steps than you take now. Benefit keeps rising up to about 8,000 to 10,000 a day for adults under 60.', ['paluch']),
      g('Do not treat 10,000 as a pass mark. Around 6,000 already carries much of the benefit.', ['paluch']),
      g('Use short walks to break up long stretches of sitting.', ['sit', 'who']),
      g('On a low day, a walk is a legitimate tool for mood.', ['noetel']),
      g('Use a step counter if you like having one. It helps a little.', ['laranjo']),
    ],
    sections: [
      { heading: 'How much', paragraphs: [
        p('In 15 cohorts with 47,471 adults, taking more steps was linked to a lower risk of death, levelling off at 8,000 to 10,000 steps a day for adults under 60 and 6,000 to 8,000 for those 60 and over. The authors note there is little evidence behind the 10,000 figure.', ['paluch'], 'strong'),
        p('Compared with the least active quarter of people, who took about 3,600 steps a day, the next quarter at about 5,800 steps had a 40% lower risk of death.', ['paluch'], 'strong'),
      ] },
      { heading: 'What else it does', paragraphs: [
        p('A five-minute walk each hour raised energy and mood and lowered fatigue in a small trial of sedentary adults.', ['sit'], 'weak'),
        p('Walking or jogging was among the most effective forms of exercise for depression across 218 trials, with low confidence in the exact size of the effect.', ['noetel'], 'moderate'),
        p('Apps and activity trackers raise activity by about 1,850 steps a day on average across 28 trials.', ['laranjo'], 'strong'),
      ] },
      { heading: "What's normal", paragraphs: [
        p('In the cohorts above, the typical person in the middle of the range took between about 5,800 and 7,800 steps a day.', ['paluch'], 'strong'),
        p('The WHO guideline says some physical activity is better than none.', ['who'], 'guideline'),
      ] },
    ],
  },
];

// ---------- build ----------
// The opening of each article is the ARTICLES text above. Deeper sections come from
// content/expansions/<article id>.json, written by research passes and merged here. The build refuses
// an expansion whose paragraphs lack a source, an evidence label, or a supporting quote.
const STRENGTHS = ['strong', 'moderate', 'weak', 'guideline'];
const KINDS = ['authority', 'journal', 'other'];
const MAX_UNCITED = 2;

function fail(id, message) { throw new Error('expansion ' + id + ': ' + message); }

function loadExpansions(dir) {
  const byId = {};
  if (!dir || !fs.existsSync(dir)) return byId;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const x = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    if (!ARTICLES.some((a) => a.id === x.id)) fail(x.id, 'there is no article with this id');
    byId[x.id] = x;
  }
  return byId;
}

// Checks one expansion and adds its sources to the library. Returns its sections, ready to append.
function mergeExpansion(x, lib) {
  const id = x.id;
  const added = Object.keys(x.sources || {});
  for (const key of added) {
    const s = x.sources[key];
    if (!/^x_[A-Za-z0-9_]+$/.test(key) || lib[key]) fail(id, 'source key ' + key + ' must start with x_ and be new');
    for (const field of ['title', 'publisher', 'url', 'kind', 'country', 'how', 'says']) {
      if (typeof s[field] !== 'string' || !s[field].trim()) fail(id, 'source ' + key + ' is missing ' + field);
    }
    if (!s.url.startsWith('https://')) fail(id, 'source ' + key + ' must have an https link');
    if (!KINDS.includes(s.kind)) fail(id, 'source ' + key + ' has an unknown kind');
    lib[key] = { title: s.title, publisher: s.publisher, url: s.url, kind: s.kind, country: s.country, how: s.how, says: s.says };
  }
  const cited = new Set();
  let uncited = 0;
  const sections = (x.sections || []).map((sec) => {
    if (typeof sec.heading !== 'string' || !sec.heading.trim()) fail(id, 'a section has no heading');
    return {
      heading: sec.heading.trim(),
      deeper: true,
      paragraphs: (sec.paragraphs || []).map((para) => {
        if (typeof para.text !== 'string' || !para.text.trim()) fail(id, 'a paragraph in "' + sec.heading + '" has no text');
        const cites = para.cites || [];
        for (const key of cites) {
          if (!lib[key]) fail(id, 'paragraph cites ' + key + ', which is not a known source');
          const quotes = (para.support || []).filter((q) => q.key === key && typeof q.quote === 'string' && q.quote.trim());
          if (!quotes.length) fail(id, 'no support quote from ' + key + ' for: ' + para.text.slice(0, 60));
          cited.add(key);
        }
        if (cites.length && !STRENGTHS.includes(para.strength)) fail(id, 'bad strength label on: ' + para.text.slice(0, 60));
        if (!cites.length) {
          if (para.strength) fail(id, 'strength label without a source on: ' + para.text.slice(0, 60));
          uncited += 1;
        }
        return { text: para.text.trim(), keys: cites, strength: cites.length ? para.strength : null };
      }),
    };
  });
  if (uncited > MAX_UNCITED) fail(id, uncited + ' uncited paragraphs; at most ' + MAX_UNCITED + ' are allowed');
  for (const key of added) if (!cited.has(key)) fail(id, 'source ' + key + ' is defined but never cited');
  return sections;
}

function build(opts = {}) {
  const outDir = opts.outDir || root;
  const expansions = loadExpansions(opts.expansionsDir === undefined ? path.join(root, 'content', 'expansions') : opts.expansionsDir);
  const lib = {};
  for (const k of Object.keys(S)) lib[k] = { title: S[k][0], publisher: S[k][1], url: S[k][2], kind: S[k][3], country: S[k][4], how: S[k][5], says: S[k][6] };
  const reviewed = [];

  const out = ARTICLES.map((a) => {
    const keys = a.sources.slice();
    keys.forEach((k) => { if (!lib[k]) throw new Error(a.id + ': unknown source ' + k); });
    const opening = a.sections.map((s) => ({
      heading: s.heading, deeper: false,
      paragraphs: s.paragraphs.map((x) => ({ text: x.text, keys: x.cites, strength: x.strength })),
    }));
    opening.forEach((s) => s.paragraphs.forEach((x) => x.keys.forEach((k) => {
      if (keys.indexOf(k) === -1) throw new Error(a.id + ': source ' + k + ' is cited but not listed');
    })));
    a.bluf.forEach((x) => x.cites.forEach((k) => {
      if (keys.indexOf(k) === -1) throw new Error(a.id + ': source ' + k + ' is cited but not listed');
    }));
    let deeper = [];
    const x = expansions[a.id];
    if (x) {
      deeper = mergeExpansion(x, lib);
      // New sources are numbered after the existing ones, in the order they are first cited.
      deeper.forEach((s) => s.paragraphs.forEach((para) => para.keys.forEach((k) => { if (keys.indexOf(k) === -1) keys.push(k); })));
      reviewed.push({ id: a.id, list: Array.isArray(x.reviewed) ? x.reviewed : [] });
    }
    const num = (list) => list.map((k) => keys.indexOf(k) + 1);
    return {
      id: a.id, kind: a.kind, title: a.title,
      bluf: a.bluf.map((g) => ({ text: g.text, cites: num(g.cites) })),
      sections: opening.concat(deeper).map((s) => ({
        heading: s.heading, deeper: s.deeper,
        paragraphs: s.paragraphs.map((para) => ({ text: para.text, cites: num(para.keys), strength: para.strength })),
      })),
      sources: keys.map((k, i) => ({ n: i + 1, title: lib[k].title, publisher: lib[k].publisher, url: lib[k].url, kind: lib[k].kind, country: lib[k].country })),
      _keys: keys,
    };
  });

  // Daily lines: every bottom-line goal, plus the opening sentence of each cited paragraph when it is short.
  // Taken word for word from the articles, then dealt out round-robin so neighbouring days differ.
  const perArticle = out.map((a) => {
    const texts = a.bluf.map((x) => x.text);
    a.sections.forEach((s) => s.paragraphs.forEach((x) => {
      if (!x.cites.length) return;
      const first = x.text.split(/(?<=[.!?])\s/)[0];
      if (first.length <= 200 && first.length >= 40) texts.push(first);
    }));
    return { id: a.id, texts: [...new Set(texts)] };
  });
  // Each article's lines are spread evenly across the year, so a long article does not cluster at the end.
  const seen = new Set();
  const pool = [];
  perArticle.forEach((a, order) => {
    const texts = a.texts.filter((text) => text.length <= 200 && !seen.has(text) && seen.add(text));
    texts.forEach((text, i) => pool.push({ key: (i + 0.5) / texts.length, order, text, page: a.id }));
  });
  pool.sort((x, y) => x.key - y.key || x.order - y.order);
  // Break up any remaining back-to-back pair from the same article by swapping in the next different one.
  for (let i = 1; i < pool.length; i++) {
    if (pool[i].page !== pool[i - 1].page) continue;
    const j = pool.findIndex((p, k) => k > i && p.page !== pool[i - 1].page && (k + 1 >= pool.length || pool[k + 1].page !== pool[i].page));
    if (j !== -1) { const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
  }
  const lines = pool.map((p) => ({ text: p.text, by: '', page: p.page }));

  const used = [];
  out.forEach((a) => a._keys.forEach((k) => { if (used.indexOf(k) === -1) used.push(k); }));
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const rows = used.map((k) => '| ' + lib[k].url + ' | ' + cell(lib[k].title) + ' | ' + cell(lib[k].how) + ' | ' + cell(lib[k].says) + ' |');
  const reviewedText = reviewed.length
    ? reviewed.map((r) => '### ' + r.id + ': ' + r.list.length + ' opened and not cited\n\n'
      + (r.list.length ? r.list.map((x) => '- ' + cell(x.title) + ' (' + x.url + '): ' + cell(x.why_not || 'no reason given')).join('\n') : '- None.')).join('\n\n')
    : 'No expansion passes have been merged yet.';
  const check = '# Source check\n\n'
    + 'Every source cited in `data/reading.json` is listed here with how it was opened and what it was found to say. A claim on the site uses only what is in the last column.\n\n'
    + '"PubMed record read through the NCBI E-utilities API" means the abstract was fetched from NCBI\'s own data service for the same record the link points to, because the PubMed web page refuses automated readers. Abstracts were read, not full texts, unless the link is a full-text page.\n\n'
    + '| Link | Source | How it was opened | What it says |\n|---|---|---|---|\n' + rows.join('\n') + '\n\n'
    + '## Opened during the expansion passes and not cited\n\n' + reviewedText + '\n\n'
    + NOT_USED;

  out.forEach((a) => { delete a._keys; });
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data', 'reading.json'), JSON.stringify(out, null, 1) + '\n');
  fs.writeFileSync(path.join(outDir, 'data', 'lines.json'), JSON.stringify(lines, null, 1) + '\n');
  fs.writeFileSync(path.join(outDir, 'docs', 'source-check.md'), check);
  if (!opts.quiet) console.log('wrote ' + out.length + ' articles, ' + used.length + ' sources, ' + lines.length + ' daily lines');
  return { articles: out.length, sources: used.length, lines: lines.length };
}

const NOT_USED = `## Checked in the first pass and not used

- UCL news page on Lally's 2010 habit study: refused the request (HTTP 403). The 66-day figure is not cited; the 2024 review that includes it is used instead.
- Milkman megastudy on nature.com, Al Khatib on nature.com, Rhodes and Kates on springer.com, Laranjo and Oja on bjsm.bmj.com: the journal pages redirected to a login or refused the request. Their PubMed records were read through the API and are cited above.
- Cochrane Library page for the portion-size review: refused (HTTP 403). The PubMed record is cited.
- Burke 2006 on group exercise (University of Birmingham PDF): refused (HTTP 403). Not cited.
- VolleyVeilig warm-up paper (PMC5541696): opened; it is a trial design with no results. Not cited.
- German Nutrition Society information sheet (PDF): downloaded but its text could not be read. The FAO page summarising the same 2024 recommendations is cited.
- Puetz 2008: the abstract gives no percentages. The "65% less fatigue" figure in press coverage is not used.
- Quarmby 2023: the advice against losing weight to prevent injury was not in the text that was read, so only the finding that weight was not linked to injury is used.
`;

module.exports = { build };
if (require.main === module) build();
