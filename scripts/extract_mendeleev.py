"""Extract the subset of the `mendeleev` database (pip package) this app needs into a vendored JSON file.

    python3 scripts/extract_mendeleev.py

Writes data/raw/mendeleev-extract.json. The extract is committed so the app build is reproducible
without Python. Source citations are recorded per field in propertymetadata (copied into the output).
"""
import hashlib, json, os, sqlite3
import mendeleev

db = os.path.join(os.path.dirname(mendeleev.__file__), "elements.db")
con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
q = lambda sql, *a: [dict(r) for r in con.execute(sql, a)]

meta = {r["column_name"] if r["table_name"] != "isotopes" else "isotopes." + r["column_name"]: {"citation_keys": r["citation_keys"], "description": r["description"], "unit": r["unit"]}
        for r in q("select * from propertymetadata where table_name is not null")}

els = q("""select atomic_number, symbol, name, atomic_weight, atomic_weight_uncertainty, density, thermal_conductivity,
  en_pauling, electron_affinity, discovery_year, discoverers, discovery_location, name_origin, uses, sources, description,
  abundance_crust, abundance_sea, is_radioactive, is_monoisotopic from elements order by atomic_number""")
assert [e["atomic_number"] for e in els] == list(range(1, 119)), "mendeleev must contain exactly Z=1..118"

ox = {}
for r in q("select atomic_number, oxidation_state, category from oxidationstates order by atomic_number, oxidation_state"):
    ox.setdefault(r["atomic_number"], []).append([r["oxidation_state"], r["category"]])

ie1 = {}  # ion_charge = 0: the neutral atom losing its first electron
for r in q("select atomic_number, ionization_energy, uncertainty, is_theoretical, is_semi_empirical from ionizationenergies where ion_charge = 0"):
    ie1[r["atomic_number"]] = r

modes = {}
for r in q("select isotope_id, mode, intensity, is_allowed_not_observed, is_observed_intensity_unknown from isotopedecaymodes order by isotope_id, intensity desc"):
    modes.setdefault(r["isotope_id"], []).append(r)

iso = {}
for r in q("""select id, atomic_number, mass_number, mass, mass_uncertainty, abundance, abundance_uncertainty, is_radioactive,
  half_life, half_life_unit, half_life_uncertainty, spin, parity from isotopes order by atomic_number, mass_number"""):
    r["decay"] = [{"mode": m["mode"], "intensity": m["intensity"], "observed": not m["is_allowed_not_observed"], "intensityKnown": not m["is_observed_intensity_unknown"]} for m in modes.get(r["id"], [])]
    iso.setdefault(r["atomic_number"], []).append({k: v for k, v in r.items() if k != "id"})

# Independent cross-check of isotope masses/abundances against NIST values shipped in `periodictable`.
import periodictable as pt
checked = 0; mass_out = []; ab_out = []; ref_zero = []; missing = 0
for z, lst in iso.items():
    for i in lst:
        if i["abundance"] is None:
            continue
        try:
            ref = pt.elements[z][i["mass_number"]]
            ref_mass, ref_ab = ref.mass, ref.abundance
        except Exception:
            missing += 1
            continue
        checked += 1
        if abs(i["mass"] - ref_mass) > 2e-4 * 1:  # 0.0002 u
            mass_out.append([pt.elements[z].symbol, i["mass_number"], i["mass"], ref_mass])
        if ref_ab == 0 and i["abundance"] > 0:      # the reference lists no natural abundance at all (e.g. uranium)
            ref_zero.append([pt.elements[z].symbol, i["mass_number"], i["abundance"], ref_ab])
        elif abs(i["abundance"] - ref_ab) > 0.02:  # percentage points
            ab_out.append([pt.elements[z].symbol, i["mass_number"], i["abundance"], ref_ab])
cross = {"reference": "periodictable " + pt.__version__ + " (NIST isotopic compositions and masses)", "naturallyOccurringIsotopesCompared": checked, "notInReference": missing,
         "massDisagreementsOver0.0002u": mass_out, "abundanceDisagreementsOver0.02pp": ab_out, "referenceHasNoAbundance": ref_zero}

out = {
    "crossCheck": cross,
    "package": {"name": "mendeleev", "version": mendeleev.__version__ if hasattr(mendeleev, "__version__") else "unknown"},
    "propertyMetadata": meta,
    "elements": [dict(e, oxidationStates=ox.get(e["atomic_number"], []), ionizationEnergy1=ie1.get(e["atomic_number"]), isotopes=iso.get(e["atomic_number"], [])) for e in els],
}
path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "mendeleev-extract.json")
with open(path, "w") as f:
    json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
print("wrote", os.path.getsize(path), "bytes; isotopes:", sum(len(e["isotopes"]) for e in out["elements"]), "; sha256", hashlib.sha256(open(path, "rb").read()).hexdigest())
