# TurnkeyAppShield - Licensing Logic Documentation

## Correct Activation vs Validation Logic

### Key Concepts

**Activation:**
- Happens once per device when license is first bound to hardware
- Creates unique device fingerprint association
- Count = Number of unique devices license is installed on

**Validation:** 
- Happens every time software starts up
- Checks if license is still valid for that device
- Count = Total number of software startup checks

### Business Rules

1. **First Time Usage**: `1 Activation = 1 Validation`
   - When software first runs on a device, it both activates AND validates
   
2. **Subsequent Usage**: `Activation stays same, Validations increase`
   - Each software startup only validates (device already activated)
   
3. **Mathematical Rule**: `Total Validations >= Total Activations`
   - You cannot have fewer validations than activations
   - Minimum: 1 activation must have at least 1 validation

### Real-World Examples

**Single Device User:**
- Day 1: First startup → 1 Activation, 1 Validation
- Day 2: Software starts → 1 Activation, 2 Validations  
- Day 3: Software starts → 1 Activation, 3 Validations
- Result: `1 activation, 100+ validations` (normal usage)

**Multi-Device User:**
- Device 1: First startup → 1 Activation, 1 Validation
- Device 2: First startup → 2 Activations, 2 Validations
- Device 1: Software starts → 2 Activations, 3 Validations
- Device 2: Software starts → 2 Activations, 4 Validations
- Result: `2 activations, 100+ validations` (normal usage)

### Database Implementation

**SQL Query for Correct Counts:**
```sql
SELECT 
    -- Activations = unique devices
    COUNT(DISTINCT device_fingerprint) as total_activations,
    -- Validations = all validation events  
    COUNT(id) as total_validations,
    -- Success/failure breakdown
    COUNT(CASE WHEN status = 'valid' THEN 1 END) as successful_validations,
    COUNT(CASE WHEN status IN ('invalid', 'expired', 'revoked', 'suspended') THEN 1 END) as failed_validations
FROM activation_logs
WHERE customer_id = ?
```

### Customer Status Examples

| Customer | Activations | Validations | Interpretation |
|----------|-------------|-------------|----------------|
| Alice | 1 | 4 | ✅ 1 device, used software 4 times |
| Bob | 1 | 5 | ✅ 1 device, used software 5 times |  
| David | 2 | 4 | ✅ 2 devices, used software 4 times total |
| Eva | 1 | 1 | ✅ 1 device, 1 failed validation (suspended) |
| Frank | 0 | 0 | ✅ Never activated (revoked customer) |

### Invalid Scenarios

❌ **1 Activation, 0 Validations** - IMPOSSIBLE
- Cannot activate without validating

❌ **0 Activations, 1 Validation** - IMPOSSIBLE  
- Cannot validate without first activating

❌ **2 Activations, 1 Validation** - IMPOSSIBLE
- Each activation requires at least 1 validation

### Frontend Display Logic

The admin dashboard should show:
- **Total Activations**: Unique devices this license runs on
- **Total Validations**: How many times software has started
- **Successful**: Valid validation checks  
- **Failed**: Invalid/blocked validation checks

This gives administrators a clear picture of actual software usage vs just device count.