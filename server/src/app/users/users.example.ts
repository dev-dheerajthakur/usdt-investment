// import { UserService } from "./users.service";

// // Get full referral tree
// async function main() {
//   // You need to provide a Repository<User> instance; here is a simple mock for example purposes:
//   const mockRepository = {} as any; // Replace with actual Repository<User> in real usage
//   const userService = new UserService(mockRepository);
  
//   const tree = await userService.getReferralTree('user-a-id');
//   /* Result:
//   [
//     { id: 'b-id', name: 'Bob', email: 'bob@email.com', level: 1 },
//   { id: 'c-id', name: 'Charlie', email: 'charlie@email.com', level: 2 },
//   { id: 'd-id', name: 'David', email: 'david@email.com', level: 3 }
//   ]
//   */
 
//  // Get only 2nd level referrals
//  const secondLevel = await userService.getReferralsByLevel('user-a-id', 2);
 
//  // Get statistics
//  const stats = await userService.getReferralStats('user-a-id');
//  /* Result:
//  [
//   { level: 1, count: 5 },
//   { level: 2, count: 15 },
//   { level: 3, count: 30 }
//   ]
//   */
 
//  // Get total referrals
//  const total = await userService.getTotalReferrals('user-a-id');
//  // Result: 50
 
//  // Create user with referral
// //  const newUser = await userService.createUser();
// }