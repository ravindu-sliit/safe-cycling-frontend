export const HAZARD_TYPE_OPTIONS = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'debris', label: 'Debris' },
  { value: 'construction-zone', label: 'Construction Zone' },
  { value: 'roadside-hazard', label: 'Roadside Hazard' },
  { value: 'collision', label: 'Collision' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'runway-safety', label: 'Runway Safety' },
  { value: 'rain', label: 'Rain' },
  { value: 'fog', label: 'Fog' },
  { value: 'snow', label: 'Snow' },
  { value: 'black-ice', label: 'Black Ice' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'equipment-malfunction', label: 'Equipment Malfunction' },
  { value: 'infrastructure-failure', label: 'Infrastructure Failure' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'fallen-tree', label: 'Fallen Tree' },
  { value: 'road-closure', label: 'Road Closure' },
  { value: 'oil-spill', label: 'Oil Spill' },
  { value: 'other', label: 'Other' },
]

export const HAZARD_TYPE_VALUES = HAZARD_TYPE_OPTIONS.map((option) => option.value)
