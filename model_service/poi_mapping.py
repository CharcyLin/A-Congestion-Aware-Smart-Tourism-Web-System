"""Only POIs covered by an identifiable government scenic-heat region.

The official counts describe a region, not admissions to an individual venue.
Do not map nearby hotels, restaurants, or resorts to a scenic region.
"""

POI_TO_REGION = {
    "ruins": "S14",
    "monte_forte": "S16",
    "senado_square": "S73",
    "st_dominic": "S72",
    "a_ma_temple": "S1",
    "guia_fortress": "S10",
    "mandarin_house": "S6",
    "lou_kau_mansion": "S73",
    "macau_tower": "S41",
    "science_center": "S11",
    "fishermans_wharf": "S42",
    "kun_iam": "S5",
    "cunha": "S45",
    "rua_do_cunha": "S45",
    "taipa_houses": "S12",
    "hac_sa": "S48",
    "coloane_village": "S51",
    "panda_pavilion": "S38",
    "new_yaohan": "S59",
}
