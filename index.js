// import React, { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { apiRequest } from '@/lib/queryClient';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Input } from '@/components/ui/input';


for (let i =5; i>=1 ; i--){
    let row = '';
    for(let j=1; j<=i; j++){
        row += j;
    }
    console.log(row);
}

// // Check token in localStorage
// const token = localStorage.getItem('token');
// console.log('🎫 Token exists:', token ? 'Yes' : 'No');
// console.log('🎫 Token value:', token ? token.substring(0, 50) + '...' : 'None');

// // Check if user is logged in
// const userString = localStorage.getItem('user');
// console.log('👤 User data exists:', userString ? 'Yes' : 'No');