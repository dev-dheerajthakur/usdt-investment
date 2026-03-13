-- deduct.lua

local key = KEYS[1]
local amount = tonumber(ARGV[1])

local balance = tonumber(redis.call("GET", key) or "0")

if balance < amount then
  return {err="INSUFFICIENT_BALANCE"}
end

redis.call("DECRBY", key, amount)

return balance - amount